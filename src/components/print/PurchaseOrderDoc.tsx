import { Bill, Settings } from "@/lib/types";
import { amountInWords, fmtDate, fmtMoney, fmtQty } from "@/lib/utils";

/* Purchase Order — replica of the Po-26/27 sample.
   Invoice To / Consignee = own firm (from Settings); Supplier = the selected party. */
export default function PurchaseOrderDoc({ bill, settings }: { bill: Bill; settings: Settings }) {
  const items = bill.bill_items || [];
  const igst = bill.tax_type === "igst";
  const halfRate = bill.gst_rate / 2;

  return (
    <div className="print-sheet mx-auto bg-white shadow max-w-[210mm] p-6">
      <div className="text-center font-bold text-[15px] mb-1">PURCHASE ORDER</div>
      <table className="bx">
        <tbody>
          <tr>
            <td className="w-1/2 bx p-0 align-top">
              <div className="p-1.5 border-b border-black">
                <div className="text-[11px]">Invoice To</div>
                <div className="font-bold text-[13px]">{settings.firm_name}</div>
                <div className="whitespace-pre-line">{settings.address}</div>
                <div>GSTIN/UIN: {settings.gstin}</div>
                <div>State Name : {settings.state_name}, Code : {settings.state_code}</div>
                <div>Contact : {settings.contact}</div>
              </div>
              <div className="p-1.5 border-b border-black">
                <div className="text-[11px]">Consignee (Ship to)</div>
                <div className="font-bold text-[13px]">{settings.firm_name}</div>
                <div className="whitespace-pre-line">{settings.address}</div>
                <div>GSTIN/UIN&nbsp;&nbsp;: {settings.gstin}</div>
                <div>State Name&nbsp;&nbsp;: {settings.state_name}, Code : {settings.state_code}</div>
              </div>
              <div className="p-1.5">
                <div className="text-[11px]">Supplier (Bill from)</div>
                {bill.supplier && (
                  <>
                    <div className="font-bold text-[13px]">{bill.supplier.name}</div>
                    <div className="whitespace-pre-line">{bill.supplier.address}</div>
                    {bill.supplier.gstin && <div>GSTIN/UIN&nbsp;&nbsp;: {bill.supplier.gstin}</div>}
                    <div>State Name&nbsp;&nbsp;: {bill.supplier.state_name}, Code : {bill.supplier.state_code}</div>
                  </>
                )}
              </div>
            </td>
            <td className="p-0 align-top">
              <table>
                <tbody>
                  <tr>
                    <td className="bx border-t-0 border-l-0 p-1 w-1/2">
                      <div className="text-[11px]">Voucher No.</div>
                      <div className="font-bold">{bill.bill_no}</div>
                    </td>
                    <td className="border-b border-black p-1">
                      <div className="text-[11px]">Dated</div>
                      <div className="font-bold">{fmtDate(bill.bill_date)}</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="bx border-l-0 p-1">
                      <div className="text-[11px]">Reference No. &amp; Date.</div>
                      <div className="font-bold">{bill.extra.reference_no || bill.bill_no}</div>
                    </td>
                    <td className="border-b border-black p-1">
                      <div className="text-[11px]">Other References</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="bx border-l-0 p-1">
                      <div className="text-[11px]">Dispatched through</div>
                      <div>{bill.extra.dispatched_through || ""}</div>
                    </td>
                    <td className="border-b border-black p-1">
                      <div className="text-[11px]">Destination</div>
                      <div>{bill.extra.destination || ""}</div>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="p-1 align-top">
                      <div className="text-[11px]">Terms of Delivery</div>
                      <div>{bill.extra.terms_of_delivery || ""}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="bx border-t-0">
        <thead>
          <tr className="text-[11px]">
            <th className="bx px-1 w-[5%]">Sl<br />No.</th>
            <th className="bx px-1 w-[38%]">Description of Goods</th>
            <th className="bx px-1 w-[10%]">HSN/SAC</th>
            <th className="bx px-1 w-[11%]">Due on</th>
            <th className="bx px-1 w-[12%]">Quantity</th>
            <th className="bx px-1 w-[10%]">Rate</th>
            <th className="bx px-1 w-[6%]">per</th>
            <th className="bx px-1 w-[13%]">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td className="bx px-1 text-center">{i + 1}</td>
              <td className="bx px-1 font-bold">{it.description}</td>
              <td className="bx px-1 text-center">{it.hsn}</td>
              <td className="bx px-1 text-center italic">{it.due_on ? fmtDate(it.due_on) : ""}</td>
              <td className="bx px-1 text-right font-bold">{fmtQty(it.qty)} {it.unit}</td>
              <td className="bx px-1 text-right">{fmtMoney(it.rate)}</td>
              <td className="bx px-1 text-center">{it.unit}</td>
              <td className="bx px-1 text-right font-bold">{fmtMoney(it.amount)}</td>
            </tr>
          ))}
          <tr>
            <td className="bx" />
            <td className="bx px-1 text-right font-bold italic pr-4">
              {igst ? <div>IGST</div> : (<><div>CGST</div><div>SGST</div></>)}
            </td>
            <td className="bx" /><td className="bx" /><td className="bx" />
            <td className="bx px-1 text-right">
              {igst ? <div>{bill.gst_rate}</div> : (<><div>{halfRate}</div><div>{halfRate}</div></>)}
            </td>
            <td className="bx px-1 text-center">
              {igst ? <div>%</div> : (<><div>%</div><div>%</div></>)}
            </td>
            <td className="bx px-1 text-right">
              {igst ? <div>{fmtMoney(bill.igst)}</div> : (<><div>{fmtMoney(bill.cgst)}</div><div>{fmtMoney(bill.sgst)}</div></>)}
            </td>
          </tr>
          <tr className="font-bold">
            <td className="bx px-1" />
            <td className="bx px-1 text-right">Total</td>
            <td className="bx px-1" /><td className="bx px-1" />
            <td className="bx px-1 text-right">{fmtQty(bill.total_qty)} {items[0]?.unit || "KGS"}</td>
            <td className="bx px-1" colSpan={2} />
            <td className="bx px-1 text-right text-[13px]">₹ {fmtMoney(bill.total)}</td>
          </tr>
        </tbody>
      </table>

      <table className="bx border-t-0">
        <tbody>
          <tr>
            <td className="p-1.5 h-40 align-top">
              <div className="text-[11px]">Amount Chargeable (in words)</div>
              <div className="font-bold">{amountInWords(bill.total)}</div>
            </td>
          </tr>
          <tr>
            <td className="p-0">
              <div className="flex justify-end">
                <div className="bx border-b-0 border-r-0 w-1/2 p-1.5 h-24">
                  <div className="text-right font-bold">for {settings.firm_name}</div>
                  <div className="text-right mt-12">Authorised Signatory</div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="text-center text-[11px] mt-1">This is a Computer Generated Document</div>
    </div>
  );
}
