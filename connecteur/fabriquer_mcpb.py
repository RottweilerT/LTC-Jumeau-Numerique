"""Fabrique l'extension Claude pour ordinateur : connecteur/dist/ltc-jumeau-lecture.mcpb
Usage : python3 connecteur/fabriquer_mcpb.py   (aucune dépendance)
Le paquet ne contient que le manifeste, le code (src/) et le mode d'emploi : jamais de clé."""
import json, os, re, zipfile
ici = os.path.dirname(os.path.abspath(__file__))
v = json.load(open(os.path.join(ici, "manifest.json"), encoding="utf-8"))["version"]
os.makedirs(os.path.join(ici, "dist"), exist_ok=True)
sortie = os.path.join(ici, "dist", "ltc-jumeau-lecture.mcpb")
fichiers = ["manifest.json", "README.md"] + [os.path.relpath(os.path.join(r, f), ici) for r, _, fs in os.walk(os.path.join(ici, "src")) for f in fs if f.endswith(".js")]
for f in fichiers:  # garde-fou : aucune clé ne doit partir dans le paquet
    t = open(os.path.join(ici, f), encoding="utf-8").read()
    if re.search(r"BEGIN (RSA )?PRIVATE KEY|\"type\":\s*\"service_account\"", t): raise SystemExit(f"Refus : {f} ressemble à une clé.")
with zipfile.ZipFile(sortie, "w", zipfile.ZIP_DEFLATED) as z:
    for f in sorted(fichiers): z.write(os.path.join(ici, f), f.replace(os.sep, "/"))
print(f"{sortie} (version {v}, {len(fichiers)} fichiers)")
