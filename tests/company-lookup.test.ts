import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  lookupCompanyByTaxId,
  parseRdVatSoap,
} from "../lib/company-lookup";
import { COMPANY } from "../lib/company";

const RD_VAT_SOAP = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><ServiceResponse xmlns="https://rdws.rd.go.th/serviceRD3/vatserviceRD3"><ServiceResult><vtitleName><anyType xsi:type="xsd:string">บริษัท</anyType></vtitleName><vName><anyType xsi:type="xsd:string">เทราบิส จำกัด</anyType></vName><vHouseNumber><anyType xsi:type="xsd:string">50/238</anyType></vHouseNumber><vSoiName><anyType xsi:type="xsd:string">ประชาอุทิศ 72</anyType></vSoiName><vThambol><anyType xsi:type="xsd:string">ทุ่งครุ</anyType></vThambol><vAmphur><anyType xsi:type="xsd:string">ทุ่งครุ</anyType></vAmphur><vProvince><anyType xsi:type="xsd:string">กรุงเทพมหานคร</anyType></vProvince><vPostCode><anyType xsi:type="xsd:string">10140</anyType></vPostCode><vBusinessFirstDate><anyType xsi:type="xsd:string">2013-01-25</anyType></vBusinessFirstDate><vmsgerr /></ServiceResult></ServiceResponse></soap:Body></soap:Envelope>`;

describe("company tax ID lookup", () => {
  it("rejects a malformed tax ID", async () => {
    const result = await lookupCompanyByTaxId("123");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "invalid");
  });

  it("returns a local CRM record without calling upstream", async () => {
    const result = await lookupCompanyByTaxId(COMPANY.taxId, {
      localRecord: {
        taxId: COMPANY.taxId,
        name: COMPANY.legalName,
        source: "crm",
      },
      fetchImpl: async () => {
        throw new Error("should not fetch");
      },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.name, COMPANY.legalName);
      assert.equal(result.source, "crm");
    }
  });

  it("parses a Revenue Department VAT SOAP payload", () => {
    const record = parseRdVatSoap(RD_VAT_SOAP, COMPANY.taxId);
    assert.ok(record);
    assert.equal(record?.name, "บริษัท เทราบิส จำกัด");
    assert.equal(record?.source, "rd_vat");
    assert.equal(record?.province, "กรุงเทพมหานคร");
    assert.equal(record?.district, "ทุ่งครุ");
    assert.equal(record?.subdistrict, "ทุ่งครุ");
    assert.equal(record?.streetAddress, "50/238 ซอยประชาอุทิศ 72");
    assert.equal(record?.zip, "10140");
  });

  it("fills company from the Revenue Department VAT service", async () => {
    const result = await lookupCompanyByTaxId(COMPANY.taxId, {
      fetchImpl: async () =>
        ({
          ok: true,
          text: async () => RD_VAT_SOAP,
        }) as Response,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.name, "บริษัท เทราบิส จำกัด");
      assert.equal(result.source, "rd_vat");
    }
  });

  it("maps MOC / DBD juristic payload to a company name", async () => {
    const result = await lookupCompanyByTaxId(COMPANY.taxId, {
      fetchImpl: async () =>
        ({
          ok: true,
          text: async () => "",
          json: async () => ({
            juristicNameTH: "บริษัท เทราบิส จำกัด",
            juristicNameEN: "TERABIS COMPANY LIMITED",
            juristicStatus: "ยังดำเนินกิจการ",
            addressDetail: {
              province: "กรุงเทพมหานคร",
              district: "ทุ่งครุ",
              subDistrict: "ทุ่งครุ",
            },
          }),
        }) as Response,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.name, "บริษัท เทราบิส จำกัด");
      assert.equal(result.source, "dbd_moc");
      assert.equal(result.province, "กรุงเทพมหานคร");
      assert.equal(result.district, "ทุ่งครุ");
    }
  });

  it("surfaces a Thai message when the DBD source is down", async () => {
    const result = await lookupCompanyByTaxId(COMPANY.taxId, {
      fetchImpl: async () => {
        throw new Error("timeout");
      },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "upstream");
      assert.match(result.error, /กรมสรรพากร/);
    }
  });
});
