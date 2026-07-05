"""
Analyse de proximité PRCC — régénère js/data.js à partir du fichier Excel source.
Usage : python scripts/analyse_proximite.py chemin/vers/base.xlsx
"""
import sys, json, math
import pandas as pd

EXCEL = sys.argv[1] if len(sys.argv) > 1 else "Base_de_données.xlsx"
SEUIL_VERT, SEUIL_ORANGE = 5, 15  # km

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(a))

df = pd.read_excel(EXCEL, sheet_name="tout")
df = df.dropna(subset=["lat_final", "lon_final"]).copy()
df["Pays"] = df["Pays"].replace({"Guinnée Bissau": "Guinée-Bissau"})

fad_rows = []
for pays in df["Pays"].unique():
    sub = df[df["Pays"] == pays]
    anchors = sub[sub["PRCC EN COURS"] == "Oui"]
    for _, f in sub[sub["PRCC EN COURS"] == "Non"].iterrows():
        dmin, near = min(
            (haversine(f.lat_final, f.lon_final, a.lat_final, a.lon_final), a["Communauté"])
            for _, a in anchors.iterrows()
        )
        statut = "vert" if dmin <= SEUIL_VERT else ("orange" if dmin <= SEUIL_ORANGE else "rouge")
        fad_rows.append({
            "com": f["Communauté"], "pays": pays, "region": f["Région"], "dept": f["Département"],
            "lat": round(f.lat_final, 6), "lon": round(f.lon_final, 6),
            "dist": round(dmin, 2), "nearest": near, "fin": int(f["Année Fin PRCC"]),
            "statut": statut,
        })

anchor_rows = [
    {"com": a["Communauté"], "pays": a["Pays"], "region": a["Région"], "dept": a["Département"],
     "lat": round(a.lat_final, 6), "lon": round(a.lon_final, 6), "fin": int(a["Année Fin PRCC"])}
    for _, a in df[df["PRCC EN COURS"] == "Oui"].iterrows()
]

data = {"fad": fad_rows, "anchors": anchor_rows}
with open("js/data.js", "w", encoding="utf-8") as f:
    f.write("// Données générées par scripts/analyse_proximite.py\n")
    f.write("const DATA = " + json.dumps(data, ensure_ascii=False) + ";\n")

print(f"OK — {len(fad_rows)} FAD + {len(anchor_rows)} ancres → js/data.js")
