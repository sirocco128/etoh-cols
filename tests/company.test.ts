import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  COMPANY,
  COMPANY_TAX_ID_PLACEHOLDER,
  formatOpeningHoursDisplay,
  isPlaceholderTaxId,
  formatRegisteredAddress,
  isPlaceholderEmail,
  isPlaceholderLine,
  isPlaceholderPhone,
} from "../lib/company";
import { getPublicContact } from "../lib/public-contact";
import type { SiteConfig } from "../lib/site";

function siteWith(
  overrides: Partial<SiteConfig> = {},
): SiteConfig {
  return {
    url: "http://localhost:3000",
    name: COMPANY.brandName,
    legalName: COMPANY.legalName,
    description: COMPANY.description,
    phoneDisplay: "02-000-0000",
    phoneHref: "tel:+6620000000",
    email: "sales@example.com",
    lineId: "@giftproasia",
    lineUrl: "https://line.me/R/ti/p/@giftproasia",
    allowIndexing: false,
    taxId: COMPANY.taxId,
    localBusiness: {
      enabled: true,
      type: "ProfessionalService",
      streetAddress: COMPANY.streetAddress,
      locality: COMPANY.locality,
      region: COMPANY.region,
      postalCode: COMPANY.postalCode,
      countryCode: "TH",
      latitude: null,
      longitude: null,
      openingHours: "Mo-Sa 08:30-17:30",
    },
    ...overrides,
  };
}

describe("company identity (non-product)", () => {
  it("uses the Etoh Cols brand and flags the tax ID as a placeholder", () => {
    assert.equal(COMPANY.brandName, "Etoh Cols");
    assert.equal(COMPANY.legalName, "บริษัท อิโตะ คอลส์ จำกัด");
    assert.equal(COMPANY.legalNameEn, "Etoh Cols Co., Ltd.");
    assert.equal(COMPANY.taxId, COMPANY_TAX_ID_PLACEHOLDER);
    assert.equal(isPlaceholderTaxId(COMPANY.taxId), true);
    assert.equal(isPlaceholderTaxId("0105556003873"), false);
    assert.equal(isPlaceholderTaxId("12345"), true);
  });

  it("formats a registered address from deployment parts", () => {
    assert.equal(
      formatRegisteredAddress({
        streetAddress: "1 ถนนตัวอย่าง",
        locality: "แขวงตัวอย่าง",
        region: "เขตตัวอย่าง กรุงเทพมหานคร",
        postalCode: "10000",
      }),
      "1 ถนนตัวอย่าง แขวงตัวอย่าง เขตตัวอย่าง กรุงเทพมหานคร 10000",
    );
  });

  it("formats schema.org opening hours for Thai display", () => {
    assert.equal(
      formatOpeningHoursDisplay("Mo-Sa 08:30-17:30"),
      "จันทร์–เสาร์ 8:30–17:30 น.",
    );
    assert.equal(formatOpeningHoursDisplay("ทุกวัน"), "ทุกวัน");
  });

  it("detects demo phone, email, and LINE", () => {
    assert.equal(isPlaceholderPhone("02-000-0000", "tel:+6620000000"), true);
    assert.equal(isPlaceholderEmail("sales@example.com"), true);
    assert.equal(
      isPlaceholderLine("@giftproasia", "https://line.me/R/ti/p/@giftproasia"),
      true,
    );
    assert.equal(isPlaceholderPhone("02-123-4567", "tel:+6621234567"), false);
    assert.equal(isPlaceholderEmail("sales@terabiz.co.th"), false);
    assert.equal(
      isPlaceholderLine("@terabiz", "https://line.me/R/ti/p/@terabiz"),
      false,
    );
  });

  it("hides demo contacts from public UI helpers", () => {
    const hidden = getPublicContact(siteWith());
    assert.deepEqual(hidden, {
      showPhone: false,
      showEmail: false,
      showLine: false,
    });

    const real = getPublicContact(
      siteWith({
        phoneDisplay: "02-123-4567",
        phoneHref: "tel:+6621234567",
        email: "sales@terabiz.co.th",
        lineId: "@terabiz",
        lineUrl: "https://line.me/R/ti/p/@terabiz",
      }),
    );
    assert.deepEqual(real, {
      showPhone: true,
      showEmail: true,
      showLine: true,
    });
  });
});
