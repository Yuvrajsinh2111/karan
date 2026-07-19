import { Bill, Settings } from "@/lib/types";
import { amountInWords, fmtDate, fmtMoney, fmtQty } from "@/lib/utils";

/* Tax Invoice — replica of the LE/26-27 sample */
export default function DirectBill({ bill, settings }: { bill: Bill; settings: Settings }) {
  const items = bill.bill_items || [];
  const igst = bill.tax_type === "igst";
  const halfRate = bill.gst_rate / 2;
  const consignee = bill.ship_to || bill.bill_to;

  return (
    <div className="print-sheet mx-auto bg-white shadow max-w-[210mm] p-6">
      <div className="text-center font-bold text-[14px] mb-1">Tax Invoice</div>
      <table className="bx">
        <tbody>
          <tr>
            {/* left: firm + consignee + buyer */}
            <td className="bx w-1/2 p-0 align-top">
              <div className="p-1.5 border-b border-black">
                <div className="font-bold text-[13px]">{settings.firm_name}</div>
                <div className="whitespace-pre-line">{settings.address}</div>
                <div>GSTIN/UIN: {settings.gstin}</div>
                <div>State Name : {settings.state_name}, Code : {settings.state_code}</div>
                <div>Contact : {settings.contact}</div>
              </div>
              <div className="p-1.5 border-b border-black min-h-[70px]">
                <div className="text-[11px]">Consignee (Ship to)</div>
                {consignee && (
                  <>
                    <div className="font-bold">{consignee.name}</div>
                    <div className="whitespace-pre-line">{consignee.address}</div>
                    {consignee.gstin && <div>GSTIN/UIN&nbsp;: {consignee.gstin}</div>}
                    <div>State Name&nbsp;: {consignee.state_name}, Code : {consignee.state_code}</div>
                  </>
                )}
              </div>
              <div className="p-1.5 min-h-[70px]">
                <div className="text-[11px]">Buyer (Bill to)</div>
                {bill.bill_to && (
                  <>
                    <div className="font-bold">{bill.bill_to.name}</div>
                    <div className="whitespace-pre-line">{bill.bill_to.address}</div>
                    {bill.bill_to.gstin && <div>GSTIN/UIN&nbsp;: {bill.bill_to.gstin}</div>}
                    <div>State Name&nbsp;: {bill.bill_to.state_name}, Code : {bill.bill_to.state_code}</div>
                  </>
                )}
              </div>
            </td>
            {/* right: invoice meta grid */}
            <td className="p-0 align-top">
              <table className="h-full">
                <tbody>
                  <MetaRow a="Invoice No." av={bill.bill_no} b="Dated" bv={fmtDate(bill.bill_date)} bold />
                  <MetaRow a="Delivery Note" av="" b="Mode/Terms of Payment" bv="" />
                  <MetaRow a="Reference No. & Date." av={bill.extra.reference_no || ""} b="Other References" bv="" />
                  <MetaRow a="Buyer's Order No." av={bill.extra.buyer_order_no || ""} b="Dated" bv="" />
                  <MetaRow a="Dispatch Doc No." av="" b="Delivery Note Date" bv="" />
                  <MetaRow a="Dispatched through" av={bill.extra.dispatched_through || ""} b="Destination" bv={bill.extra.destination || ""} />
                  <tr>
                    <td colSpan={2} className="p-1 align-top h-full">
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

      {/* goods */}
      <table className="bx border-t-0">
        <thead>
          <tr className="text-[11px]">
            <th className="bx px-1 w-[5%]">Sl<br />No.</th>
            <th className="bx px-1 w-[38%]">Description of Goods</th>
            <th className="bx px-1 w-[10%]">HSN/SAC</th>
            <th className="bx px-1 w-[11%]">Quantity</th>
            <th className="bx px-1 w-[10%]">Rate</th>
            <th className="bx px-1 w-[6%]">per</th>
            <th className="bx px-1 w-[7%]">Disc. %</th>
            <th className="bx px-1 w-[13%]">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td className="bx px-1 text-center">{i + 1}</td>
              <td className="bx px-1 font-bold">{it.description}</td>
              <td className="bx px-1 text-center">{it.hsn}</td>
              <td className="bx px-1 text-right font-bold">{fmtQty(it.qty)} {it.unit}</td>
              <td className="bx px-1 text-right">{fmtMoney(it.rate)}</td>
              <td className="bx px-1 text-center">{it.unit}</td>
              <td className="bx px-1 text-center">{it.disc_pct ? it.disc_pct : ""}</td>
              <td className="bx px-1 text-right font-bold">{fmtMoney(it.amount)}</td>
            </tr>
          ))}
          {/* tax lines inside the description column, like the sample */}
          <tr>
            <td className="bx" />
            <td className="bx px-1">
              <div className="text-right font-bold italic pr-4">
                {igst ? <div>IGST</div> : (<><div>SGST</div><div>CGST</div></>)}
                <div className="not-italic font-normal text-left">Less :&nbsp;&nbsp;&nbsp;<span className="italic font-bold float-right pr-0">Round of</span></div>
              </div>
            </td>
            <td className="bx" />
            <td className="bx" />
            <td className="bx px-1 text-right">
              {igst ? <div>{bill.gst_rate}</div> : (<><div>{halfRate}</div><div>{halfRate}</div></>)}
            </td>
            <td className="bx px-1 text-center">
              {igst ? <div>%</div> : (<><div>%</div><div>%</div></>)}
            </td>
            <td className="bx" />
            <td className="bx px-1 text-right">
              {igst ? <div>{fmtMoney(bill.igst)}</div> : (<><div>{fmtMoney(bill.sgst)}</div><div>{fmtMoney(bill.cgst)}</div></>)}
              <div>({bill.round_off < 0 ? "-" : ""}){fmtMoney(Math.abs(bill.round_off))}</div>
            </td>
          </tr>
          <tr className="font-bold">
            <td className="bx px-1" />
            <td className="bx px-1 text-right">Total</td>
            <td className="bx px-1" />
            <td className="bx px-1 text-right">{fmtQty(bill.total_qty)} {items[0]?.unit || "KGS"}</td>
            <td className="bx px-1" colSpan={3} />
            <td className="bx px-1 text-right text-[13px]">₹ {fmtMoney(bill.total)}</td>
          </tr>
        </tbody>
      </table>

      <table className="bx border-t-0">
        <tbody>
          <tr>
            <td className="p-1.5">
              <div className="flex justify-between text-[11px]">
                <span>Amount Chargeable (in words)</span><span className="italic">E. &amp; O.E</span>
              </div>
              <div className="font-bold">{amountInWords(bill.total)}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* tax summary */}
      <table className="bx border-t-0 text-[11px]">
        <thead>
          <tr>
            <th className="bx px-1" rowSpan={2}>Taxable<br />Value</th>
            {igst ? (
              <th className="bx px-1" colSpan={2}>Integrated Tax</th>
            ) : (
              <>
                <th className="bx px-1" colSpan={2}>Central Tax</th>
                <th className="bx px-1" colSpan={2}>State Tax</th>
              </>
            )}
            <th className="bx px-1" rowSpan={2}>Total<br />Tax Amount</th>
          </tr>
          <tr>
            <th className="bx px-1">Rate</th>
            <th className="bx px-1">Amount</th>
            {!igst && (<><th className="bx px-1">Rate</th><th className="bx px-1">Amount</th></>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="bx px-1 text-right">{fmtMoney(bill.subtotal)}</td>
            {igst ? (
              <>
                <td className="bx px-1 text-center">{bill.gst_rate}%</td>
                <td className="bx px-1 text-right">{fmtMoney(bill.igst)}</td>
              </>
            ) : (
              <>
                <td className="bx px-1 text-center">{halfRate}%</td>
                <td className="bx px-1 text-right">{fmtMoney(bill.cgst)}</td>
                <td className="bx px-1 text-center">{halfRate}%</td>
                <td className="bx px-1 text-right">{fmtMoney(bill.sgst)}</td>
              </>
            )}
            <td className="bx px-1 text-right">{fmtMoney(bill.cgst + bill.sgst + bill.igst)}</td>
          </tr>
          <tr className="font-bold">
            <td className="bx px-1 text-right">Total: {fmtMoney(bill.subtotal)}</td>
            {igst ? (
              <>
                <td className="bx px-1" />
                <td className="bx px-1 text-right">{fmtMoney(bill.igst)}</td>
              </>
            ) : (
              <>
                <td className="bx px-1" />
                <td className="bx px-1 text-right">{fmtMoney(bill.cgst)}</td>
                <td className="bx px-1" />
                <td className="bx px-1 text-right">{fmtMoney(bill.sgst)}</td>
              </>
            )}
            <td className="bx px-1 text-right">{fmtMoney(bill.cgst + bill.sgst + bill.igst)}</td>
          </tr>
        </tbody>
      </table>

      <table className="bx border-t-0">
        <tbody>
          <tr>
            <td className="p-1.5">
              <div>Tax Amount (in words) :&nbsp;<b>{amountInWords(bill.cgst + bill.sgst + bill.igst)}</b></div>
              <div className="mt-6">
                <u>Declaration</u>
                <div>{settings.declaration}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td className="p-0">
              <table>
                <tbody>
                  <tr>
                    <td className="bx border-b-0 border-l-0 w-1/2 p-1.5 h-16 align-bottom">Customer&apos;s Seal and Signature</td>
                    <td className="bx border-b-0 border-r-0 p-1.5 h-16 align-top text-right">
                      <div className="font-bold">for {settings.firm_name}</div>
                      <div className="mt-8">Authorised Signatory</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="text-center text-[11px] mt-1">This is a Computer Generated Invoice</div>
    </div>
  );
}

function MetaRow({ a, av, b, bv, bold }: { a: string; av: string; b: string; bv: string; bold?: boolean }) {
  return (
    <tr>
      <td className="bx border-r border-black p-1 w-1/2 align-top">
        <div className="text-[11px]">{a}</div>
        <div className={bold ? "font-bold" : ""}>{av || " "}</div>
      </td>
      <td className="border-b border-black p-1 align-top">
        <div className="text-[11px]">{b}</div>
        <div className={bold ? "font-bold" : ""}>{bv || " "}</div>
      </td>
    </tr>
  );
}
