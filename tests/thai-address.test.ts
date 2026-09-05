import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatShipToLabel,
  formatThaiMailingAddress,
  listThaiDistricts,
  listThaiProvinces,
  listThaiSubdistricts,
  matchThaiAddressParts,
  searchThaiAddress,
  thaiDistrictLabel,
  thaiSubdistrictLabel,
} from "../lib/thai-address";

describe("thai-address autocomplete", () => {
  it("lists 77 provinces including Bangkok", () => {
    const provinces = listThaiProvinces();
    assert.equal(provinces.length, 77);
    assert.ok(provinces.includes("กรุงเทพมหานคร"));
    assert.ok(listThaiProvinces("กรุง").includes("กรุงเทพมหานคร"));
    assert.ok(listThaiProvinces("กทม").includes("กรุงเทพมหานคร"));
  });

  it("cascades district and subdistrict for Thung Khru", () => {
    const districts = listThaiDistricts("กรุงเทพมหานคร");
    assert.ok(districts.includes("ทุ่งครุ"));
    const tambons = listThaiSubdistricts("กรุงเทพมหานคร", "ทุ่งครุ");
    const names = tambons.map((row) => row.name);
    assert.ok(names.includes("ทุ่งครุ"));
    assert.ok(names.includes("บางมด"));
    assert.equal(tambons.find((row) => row.name === "ทุ่งครุ")?.zip, "10140");
  });

  it("searches by tambon name", () => {
    const hits = searchThaiAddress("ทุ่งครุ", 5);
    assert.ok(hits.length >= 1);
    assert.equal(hits[0]?.province, "กรุงเทพมหานคร");
    assert.equal(
      formatShipToLabel(hits[0]!),
      "แขวงทุ่งครุ เขตทุ่งครุ กรุงเทพมหานคร",
    );
  });

  it("matches MOC place names with อำเภอ/เขต prefixes stripped", () => {
    const matched = matchThaiAddressParts({
      province: "จังหวัดกรุงเทพมหานคร",
      district: "เขตทุ่งครุ",
      subdistrict: "แขวงทุ่งครุ",
    });
    assert.equal(matched.province, "กรุงเทพมหานคร");
    assert.equal(matched.district, "ทุ่งครุ");
    assert.equal(matched.subdistrict, "ทุ่งครุ");
  });

  it("uses เขต/แขวง for Bangkok and ตำบล/อำเภอ elsewhere", () => {
    assert.equal(thaiDistrictLabel("กรุงเทพมหานคร"), "เขต");
    assert.equal(thaiSubdistrictLabel("กทม"), "แขวง");
    assert.equal(thaiDistrictLabel("นนทบุรี"), "อำเภอ");
    assert.equal(thaiSubdistrictLabel("นนทบุรี"), "ตำบล");
    assert.equal(
      formatThaiMailingAddress({
        streetAddress: "50/238 ซอยประชาอุทิศ 72",
        province: "กรุงเทพมหานคร",
        district: "ทุ่งครุ",
        subdistrict: "ทุ่งครุ",
        zip: "10140",
      }),
      "50/238 ซอยประชาอุทิศ 72 แขวงทุ่งครุ เขตทุ่งครุ กรุงเทพมหานคร 10140",
    );
    assert.equal(
      formatThaiMailingAddress({
        streetAddress: "99/1",
        province: "นนทบุรี",
        district: "ปากเกร็ด",
        subdistrict: "คลองข่อย",
      }),
      "99/1 ตำบลคลองข่อย อำเภอปากเกร็ด จังหวัดนนทบุรี",
    );
  });
});
