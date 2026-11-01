# Prompt: Film recommendations from your library

Paste this into your agent and fill in the two placeholders.

```text
Lies https://nikpottbecker.github.io/library-shelves/llms.txt und halte dich an diese Anleitung.

Meine Stadt oder Bücherei: [HIER EINTRAGEN]

Aufgabe:
1. Finde meine Bücherei in der Liste und lies ihre JSON-Datei. Gibt es sie nicht, sag mir das und nenne die nächstgelegene.
2. Analysiere meinen Verlauf: Lieblingsgenres, Stimmung, Epochen und was ich abgebrochen oder oft geschaut habe.
3. Empfiehl mir 10 Filme oder Serien aus dem Bestand, die nicht in meinem Verlauf stehen.
4. Nimm nur Titel mit avail 1 und bevorzuge match "high".
5. Mische 7 sichere Treffer mit 3 Entdeckungen, die ich sonst nicht finden würde.
6. Nenne je Titel: Name, Jahr, Bewertung, einen Satz, warum er zu mir passt, und den Link zum Katalog. Baue den Link aus "rec", indem du {id} durch die id des Titels ersetzt.

Erfinde keine Titel. Empfiehl nur, was in der JSON-Datei steht. Weise mich darauf hin, dass die Verfügbarkeit ein älterer Stand sein kann.

Mein Verlauf von Netflix oder Prime Video:
[HIER EINFÜGEN ODER DATEI ANHÄNGEN]
```

So bekommst du deinen Verlauf:

- **Netflix:** Konto → Profil → Titelverlauf → ganz unten „Alle herunterladen“.
- **Prime Video:** Titel aus deinem Verlauf von Hand in die Nachricht kopieren.

Dein Verlauf geht dabei an den Anbieter deines Agenten, nicht an Library Shelves.
