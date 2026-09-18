import { supabase } from '@/integrations/supabase/client';
import type { FulfillmentType, OrderSourceDevice } from '@/types/restaurant';

export interface WorkflowItemInput {
  menuItemId: string;
  variantId?: string;
  quantity: number;
  notes?: string;
}

export interface CreateWorkflowOrderInput {
  orderNumber: string;
  fulfillmentType: FulfillmentType;
  items: WorkflowItemInput[];
  tableId?: string;
  waiterId?: string;
  customerName?: string;
  paymentMethod?: 'cash' | 'card' | 'mobile';
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
  discountReason?: string;
  sourceDevice?: OrderSourceDevice;
  orderChannel?: string;
  idempotencyKey?: string;
}

export type ItemLessReason =
  | 'customer_changed_mind'
  | 'wrong_item_entered'
  | 'item_unavailable'
  | 'duplicate_entry'
  | 'kitchen_issue'
  | 'customer_complaint'
  | 'other';

const rpc = (name: string, args: Record<string, unknown>) =>
  // Generated Supabase types will include these RPCs after the Task 1 migration is applied.
  // Keep this adapter isolated so the rest of the application remains strongly typed.
  (supabase as any).rpc(name, args);

const toDbItems = (items: WorkflowItemInput[]) =>
  items.map((item) => ({
    menu_item_id: item.menuItemId,
    variant_id: item.variantId ?? null,
    quantity: item.quantity,
    notes: item.notes ?? null,
  }));

export const makeOrderIdempotencyKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `order-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export async function createWorkflowOrder(input: CreateWorkflowOrderInput) {
  const { data, error } = await rpc('create_order_atomic', {
    p_order_number: input.orderNumber,
    p_fulfillment_type: input.fulfillmentType,
    p_items: toDbItems(input.items),
    p_table_id: input.tableId ?? null,
    p_waiter_id: input.waiterId ?? null,
    p_customer_name: input.customerName ?? null,
    p_payment_method: input.paymentMethod ?? 'cash',
    p_discount_type: input.discountType ?? 'fixed',
    p_discount_value: input.discountValue ?? 0,
    p_discount_reason: input.discountReason ?? null,
    p_source_device: input.sourceDevice ?? 'POS',
    p_order_channel: input.orderChannel ?? 'pos',
    p_idempotency_key: input.idempotencyKey ?? makeOrderIdempotencyKey(),
  });
  if (error) throw error;
  return data as {
    order_id: string;
    batch_id?: string;
    duplicate: boolean;
    total?: number;
  };
}

export async function addItemsToWorkflowOrder(
  orderId: string,
  items: WorkflowItemInput[],
  options?: { sourceDevice?: OrderSourceDevice; idempotencyKey?: string },
) {
  const { data, error } = await rpc('add_order_items_batch', {
    p_order_id: orderId,
    p_items: toDbItems(items),
    p_source_device: options?.sourceDevice ?? 'POS',
    p_idempotency_key: options?.idempotencyKey ?? makeOrderIdempotencyKey(),
  });
  if (error) throw error;
  return data as {
    order_id: string;
    batch_id: string;
    batch_number: number;
    duplicate: boolean;
    amount_added?: number;
  };
}

export async function createItemLess(input: {
  orderItemId: string;
  quantityLess: number;
  reasonCode: ItemLessReason;
  reasonDetails?: string;
  inventoryDisposition?: 'not_prepared' | 'waste' | 'returned';
  sourceDevice?: OrderSourceDevice;
}) {
  const { data, error } = await rpc('create_item_less', {
    p_order_item_id: input.orderItemId,
    p_quantity_less: input.quantityLess,
    p_reason_code: input.reasonCode,
    p_reason_details: input.reasonDetails ?? null,
    p_inventory_disposition: input.inventoryDisposition ?? 'not_prepared',
    p_source_device: input.sourceDevice ?? 'POS',
  });
  if (error) throw error;
  return data as {
    event_id: string;
    order_id: string;
    final_quantity: number;
    amount_affected: number;
  };
}
