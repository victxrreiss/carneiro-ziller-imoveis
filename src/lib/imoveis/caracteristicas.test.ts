import { expect, test } from "vitest";
import { CARACTERISTICAS_FILTRO, CARACTERISTICA_VRSYNC, rotuloCaracteristica } from "./caracteristicas";

test("toda Feature do feed real tem chave, menos 'Number of stories'", () => {
  const doFeed = ["Gym","Maids Quarters","Party Room","Kitchen","Gourmet Area","Playground","Cooling","Pool","Intercom","Fenced Yard","Game room","Tennis court","BBQ","Garden Area","Exterior View","Spa","Home Office","Elevator","Furnished","Sauna","TV Security","Backyard","Fireplace","Laundry","Internet Connection","Balcony","Reception room","Heating","Ocean View","Warehouse"];
  for (const f of doFeed) expect(CARACTERISTICA_VRSYNC[f], f).toBeDefined();
  expect(CARACTERISTICA_VRSYNC["Number of stories"]).toBeUndefined();
});

test("toda chave mapeada existe na lista e tem rótulo em português", () => {
  for (const chave of Object.values(CARACTERISTICA_VRSYNC)) expect(rotuloCaracteristica(chave)).toMatch(/\S/);
  expect(rotuloCaracteristica(CARACTERISTICA_VRSYNC["Pool"])).toBe("Piscina");
  expect(rotuloCaracteristica(CARACTERISTICA_VRSYNC["Gym"])).toBe("Academia");
});

test("filtros rápidos são chaves válidas", () => {
  for (const c of CARACTERISTICAS_FILTRO) expect(rotuloCaracteristica(c)).toBeDefined();
});
