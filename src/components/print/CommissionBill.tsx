import { Bill, Settings } from "@/lib/types";
import { fmtDate, fmtMoney, fmtQty, numberToWordsIndian } from "@/lib/utils";

/* Commission Tax Invoice — replica of the "6.pdf" sample */
export default function CommissionBill({ bill, settings }: { bill: Bill; settings: Settings }) {
  const items = bill.bill_items || [];
  const igst = bill.tax_type === "igst";
  const halfRate = bill.gst_rate / 2;
  const totalTax = bill.cgst + bill.sgst + bill.igst;

  return (
    <div className="print-sheet mx-auto bg-white shadow max-w-[210mm] p-6 text-[11px]">
      <table className="bx">
        <tbody>
          {/* header */}
          <tr>
            <td colSpan={2} className="p-1.5 text-center border-b border-black">
              <div className="font-bold text-[13px]">{settings.firm_name}</div>
              <div className="font-semibold whitespace-pre-line">{settings.address}</div>
              <div className="font-semibold">Mobile no {settings.mobile}</div>
              <div className="font-semibold">GSTIN: {settings.gstin}</div>
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="p-1 text-center border-b border-black">
              <span className="font-bold text-[14px]">Tax Invoice</span>
            </td>
          </tr>
          {/* meta */}
          <tr>
            <td className="w-1/2 p-0 border-r border-black border-b align-top">
              <div className="px-1.5 py-0.5 border-b border-black">Invoice No: <b>{bill.seq}</b></div>
              <div className="px-1.5 py-0.5 border-b border-black">Invoice date: <b>{fmtDate(bill.bill_date)}</b></div>
              <div className="px-1.5 py-0.5 border-b border-black">Reverse Charge (Y/N): NO</div>
              <div className="px-1.5 py-0.5">State: {settings.state_name.toUpperCase()} &nbsp;&nbsp; Code-GJ</div>
            </td>
            <td className="p-0 border-b border-black align-top">
              <div className="px-1.5 py-0.5 border-b border-black">Transport Mode: {bill.extra.transport_mode || "NA"}</div>
              <div className="px-1.5 py-0.5 border-b border-black">Vehicle number: {bill.extra.vehicle_no || "NA"}</div>
              <div className="px-1.5 py-0.5">Place of Supply: {bill.extra.place_of_supply || "NA"}</div>
            </td>
          </tr>
          {/* parties */}
          <tr className="text-center font-bold">
            <td className="border-r border-b border-black py-0.5">Bill to Party</td>
            <td className="border-b border-black py-0.5">Ship to Party</td>
          </tr>
          <tr>
            <td className="border-r border-black p-1.5 align-top min-h-[80px]">
              {bill.bill_to && (
                <>
                  <div>NAME- <b>{bill.bill_to.name}</b></div>
                  <div className="whitespace-pre-line">ADDRESS- {bill.bill_to.address}</div>
                  {bill.bill_to.gstin && <div>GSTIN- {bill.bill_to.gstin}</div>}
                  <div>State: {bill.bill_to.state_name} &nbsp; Code: {bill.bill_to.state_code}</div>
                </>
              )}
            </td>
            <td className="p-1.5 align-top">
              <div>NAME-{bill.ship_to ? <b> {bill.ship_to.name}</b> : "NA"}</div>
              <div className="whitespace-pre-line">ADDRESS-{bill.ship_to ? ` ${bill.ship_to.address}` : "NA"}</div>
              <div>GSTIN-{bill.ship_to?.gstin || "NA"}</div>
              <div>State: {bill.ship_to ? `${bill.ship_to.state_name}  Code: ${bill.ship_to.state_code}` : "NA"}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* items */}
      <table className="bx border-t-0 text-center">
        <thead>
          <tr>
            <th className="bx px-1" rowSpan={2}>S.<br />no.</th>
            <th className="bx px-1" rowSpan={2}>Product Description</th>
            <th className="bx px-1" rowSpan={2}>HSN code</th>
            <th className="bx px-1" rowSpan={2}>UNIT</th>
            <th className="bx px-1" rowSpan={2}>QTY</th>
            <th className="bx px-1" rowSpan={2}>UNIT<br />RATE</th>
            <th className="bx px-1" rowSpan={2}>Amount</th>
            <th className="bx px-1" rowSpan={2}>Taxable<br />Value</th>
            {igst ? (
              <th className="bx px-1" colSpan={2}>IGST</th>
            ) : (
              <>
                <th className="bx px-1" colSpan={2}>CGST</th>
                <th className="bx px-1" colSpan={2}>SGST</th>
              </>
            )}
            <th className="bx px-1" rowSpan={2}>Total</th>
          </tr>
          <tr>
            <th className="bx px-1">Rate</th>
            <th className="bx px-1">Amount</th>
            {!igst && (<><th className="bx px-1">Rate</th><th className="bx px-1">Amount</th></>)}
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const taxOnItem = igst
              ? (it.amount * bill.gst_rate) / 100
              : (it.amount * bill.gst_rate) / 100;
            return (
              <tr key={i}>
                <td className="bx px-1">{i + 1}</td>
                <td className="bx px-1 text-left font-bold">{it.description}</td>
                <td className="bx px-1">{it.hsn}</td>
                <td className="bx px-1">{it.unit}</td>
                <td className="bx px-1 text-right">{fmtQty(it.qty)}</td>
                <td className="bx px-1 text-right">{fmtMoney(it.rate, it.rate % 1 === 0 ? 0 : 2)}</td>
                <td className="bx px-1 text-right">{fmtMoney(it.amount)}</td>
                <td className="bx px-1 text-right">{fmtMoney(it.amount)}</td>
                {igst ? (
                  <>
                    <td className="bx px-1">{bill.gst_rate}</td>
                    <td className="bx px-1 text-right">{fmtMoney((it.amount * bill.gst_rate) / 100)}</td>
                  </>
                ) : (
                  <>
                    <td className="bx px-1">{halfRate}</td>
                    <td className="bx px-1 text-right">{fmtMoney((it.amount * halfRate) / 100)}</td>
                    <td className="bx px-1">{halfRate}</td>
                    <td className="bx px-1 text-right">{fmtMoney((it.amount * halfRate) / 100)}</td>
                  </>
                )}
                <td className="bx px-1 text-right">{fmtMoney(it.amount + taxOnItem)}</td>
              </tr>
            );
          })}
          <tr className="font-bold">
            <td className="bx px-1" colSpan={4}>TOTAL</td>
            <td className="bx px-1 text-right">{fmtQty(bill.total_qty)}</td>
            <td className="bx px-1" />
            <td className="bx px-1 text-right">{fmtMoney(bill.subtotal)}</td>
            <td className="bx px-1 text-right">{fmtMoney(bill.subtotal)}</td>
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
            <td className="bx px-1 text-right">{fmtMoney(bill.subtotal + totalTax)}</td>
          </tr>
        </tbody>
      </table>

      {/* words + totals block */}
      <table className="bx border-t-0">
        <tbody>
          <tr>
            <td className="w-[55%] border-r border-black p-0 align-top">
              <div className="text-center border-b border-black py-0.5 font-semibold">Total Invoice amount in words</div>
              <div className="p-2 font-bold">
                {numberToWordsIndian(bill.total)} Rupees Only
              </div>
            </td>
            <td className="p-0 align-top">
              <TotRow l="Total Amount before Tax" v={fmtMoney(bill.subtotal)} />
              {igst ? (
                <TotRow l={`Add: IGST@${bill.gst_rate}%`} v={fmtMoney(bill.igst)} />
              ) : (
                <>
                  <TotRow l={`Add: CGST@${halfRate}%`} v={fmtMoney(bill.cgst)} />
                  <TotRow l={`Add: SGST@${halfRate}%`} v={fmtMoney(bill.sgst)} />
                </>
              )}
              <TotRow l="Total Tax Amount" v={fmtMoney(totalTax)} />
              <TotRow l="Round off" v={fmtMoney(bill.round_off)} />
              <TotRow l="Total Amount after Tax" v={`₹ ${fmtMoney(bill.total, 2)}`} bold />
            </td>
          </tr>
          {/* bank + signature */}
          <tr>
            <td className="border-r border-t border-black p-0 align-top">
              <div className="px-1.5 py-0.5 font-semibold border-b border-black">Bank details</div>
              <div className="px-1.5 py-0.5 border-b border-black">A/C: {settings.bank_ac}</div>
              <div className="px-1.5 py-0.5 border-b border-black">IFSC: {settings.bank_ifsc}</div>
              <div className="px-1.5 py-0.5 border-b border-black">Bank name: {settings.bank_name}</div>
              <div className="text-center py-0.5 font-semibold border-b border-black">Terms &amp; conditions</div>
              <div className="h-14 flex items-end justify-end pr-4 pb-1 font-semibold">Common Seal</div>
            </td>
            <td className="border-t border-black p-1.5 align-top text-center">
              <div className="text-[10px]">Certified that the particulars given above are true and correct</div>
              <div className="font-bold mt-2">FOR {settings.firm_name}</div>
              <div className="mt-12 font-semibold">Authorised signatory</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function TotRow({ l, v, bold }: { l: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-black px-1.5 py-0.5 ${bold ? "font-bold" : ""}`}>
      <span>{l}</span><span>{v}</span>
    </div>
  );
}
