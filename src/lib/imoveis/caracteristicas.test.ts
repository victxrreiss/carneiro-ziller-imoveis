import { expect, test } from "vitest";
import {
  atendeFiltroCaracteristica,
  CARACTERISTICA_CRM,
  CARACTERISTICA_VRSYNC,
  CARACTERISTICAS,
  CARACTERISTICAS_FILTRO,
  chaveParaTipo,
  rotuloCaracteristica,
  rotuloFiltroCaracteristica,
} from "./caracteristicas";

test("toda Feature do feed real tem chave, menos 'Number of stories'", () => {
  const doFeed = ["Gym","Maids Quarters","Party Room","Kitchen","Gourmet Area","Playground","Cooling","Pool","Intercom","Fenced Yard","Game room","Tennis court","BBQ","Garden Area","Exterior View","Spa","Home Office","Elevator","Furnished","Sauna","TV Security","Backyard","Fireplace","Laundry","Internet Connection","Balcony","Reception room","Heating","Ocean View","Warehouse"];
  for (const f of doFeed) expect(CARACTERISTICA_VRSYNC[f], f).toBeDefined();
  expect(CARACTERISTICA_VRSYNC["Number of stories"]).toBeUndefined();
});

test("toda chave mapeada (feed e CRM) existe na lista e tem rótulo em português", () => {
  for (const chave of [...Object.values(CARACTERISTICA_VRSYNC), ...Object.values(CARACTERISTICA_CRM)]) expect(rotuloCaracteristica(chave), chave).toMatch(/\S/);
  expect(rotuloCaracteristica(CARACTERISTICA_VRSYNC["Gym"])).toBe("Academia");
});

test("lista em dois grupos, com os itens das abas do CRM: 54 do imóvel e 50 do condomínio, sem chave repetida", () => {
  expect(CARACTERISTICAS.filter((c) => c.grupo === "imovel")).toHaveLength(54);
  expect(CARACTERISTICAS.filter((c) => c.grupo === "condominio")).toHaveLength(50);
  expect(new Set(CARACTERISTICAS.map((c) => c.chave)).size).toBe(CARACTERISTICAS.length);
  // Um campo do CRM por item: todo item tem o seu campo.
  expect(new Set(Object.values(CARACTERISTICA_CRM)).size).toBe(CARACTERISTICAS.length);
});

test("piscina e sauna do feed: do condomínio, mas privativas em casa", () => {
  expect(chaveParaTipo(CARACTERISTICA_VRSYNC["Pool"], "Apartamento")).toBe("piscina-coletiva");
  expect(chaveParaTipo(CARACTERISTICA_VRSYNC["Pool"], "Casa em condomínio")).toBe("piscina");
  expect(chaveParaTipo(CARACTERISTICA_VRSYNC["Sauna"], "Casa")).toBe("sauna");
  expect(chaveParaTipo(CARACTERISTICA_VRSYNC["Sauna"], null)).toBe("sauna-coletiva");
  expect(chaveParaTipo("academia", "Casa")).toBe("academia");
});

test("filtros rápidos: chaves válidas; Piscina aceita a do imóvel e a do condomínio", () => {
  for (const c of CARACTERISTICAS_FILTRO) expect(rotuloFiltroCaracteristica(c)).toBeDefined();
  expect(rotuloFiltroCaracteristica("piscina")).toBe("Piscina");
  expect(rotuloFiltroCaracteristica("area-gourmet")).toBe("Área gourmet");
  expect(atendeFiltroCaracteristica("piscina", ["piscina-coletiva"])).toBe(true);
  expect(atendeFiltroCaracteristica("piscina", ["piscina"])).toBe(true);
  expect(atendeFiltroCaracteristica("piscina", ["sauna"])).toBe(false);
  expect(atendeFiltroCaracteristica("varanda", ["varanda-com-churrasqueira"])).toBe(true);
  expect(atendeFiltroCaracteristica("academia", ["academia"])).toBe(true);
});
