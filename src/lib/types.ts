export type BillType = "direct" | "commission" | "purchase_order";

export interface PartySnap {
  name: string;
  address: string;
  gstin: string;
  state_name: string;
  state_code: string;
  contact: string;
}

export interface Party extends PartySnap {
  id: string;
  created_at: string;
  active: boolean;
}

export interface Product {
  id: string;
  created_at: string;
  name: string;
  hsn: string;
  unit: string;
  default_rate: number;
  active: boolean;
}

export interface Settings {
  id: number;
  firm_name: string;
  address: string;
  gstin: string;
  state_name: string;
  state_code: string;
  contact: string;
  mobile: string;
  bank_name: string;
  bank_ac: string;
  bank_ifsc: string;
  declaration: string;
  direct_prefix: string;
  po_prefix: string;
  default_gst_rate: number;
  last_backup_at: string | null;
}

export interface BillItem {
  id?: string;
  bill_id?: string;
  pos: number;
  product_id: string | null;
  description: string;
  hsn: string;
  qty: number;
  unit: string;
  rate: number;
  disc_pct: number;
  amount: number;
  due_on: string | null;
  base_rate: number | null;
}

export interface BillExtra {
  reference_no?: string;
  transport_mode?: string;
  vehicle_no?: string;
  place_of_supply?: string;
  dispatched_through?: string;
  destination?: string;
  terms_of_delivery?: string;
  buyer_order_no?: string;
  [key: string]: string | undefined;
}

export interface Bill {
  id: string;
  created_at: string;
  type: BillType;
  fy: string;
  seq: number;
  bill_no: string;
  bill_date: string;
  bill_to_id: string | null;
  bill_to: PartySnap | null;
  ship_to_id: string | null;
  ship_to: PartySnap | null;
  supplier_id: string | null;
  supplier: PartySnap | null;
  tax_type: "cgst_sgst" | "igst";
  gst_rate: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  round_off: number;
  total: number;
  total_qty: number;
  commission_total: number;
  paid: boolean;
  notes: string;
  extra: BillExtra;
  bill_items?: BillItem[];
}

export const BILL_TYPE_LABEL: Record<BillType, string> = {
  direct: "Tax Invoice",
  commission: "Commission Bill",
  purchase_order: "Purchase Order",
};

export const BILL_TYPE_SHORT: Record<BillType, string> = {
  direct: "Invoice",
  commission: "Commission",
  purchase_order: "PO",
};
