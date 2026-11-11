# FP Flow — coöp quests: veilig ontwerp, NOG NIET LIVE

**Huidige stand**: vrienden zijn opt-in en delen uitsluitend hun hero-card. Deze PR verwijdert de comparatieve level-rangschikking uit de vriendenlijst: het zijn *teamgenoten*, zonder herstel- of krachtplek. Het is nog **geen gesynchroniseerde coöperatieve quest**. Wij presenteren die ook niet zo.

**Voor een werkende teamquest vereist**:
1. Een expliciete, afzonderlijke toestemming voor teamquests (dus niet dezelfde toggle als hero delen). Duidelijke intrekking + verwijdering.
2. Eigen deelnamedata uitsluitend in een eigen tenant/gebruikerscontext verwerken. Bereken deelname server-side aan het EIGEN voorgeschreven programma; restdagen of een medisch stopadvies mogen niet straffen.
3. Alleen groepsaggregaten uitleveren (zonder wie wat deed, pijn, diagnoses, praktijken, programma's, ritmes of tijdstippen). Vermijd small-group reidentification; productreview vereist voor minimum teamgrootte.
4. Anti-gaming: geen extra herhalingen of trainen door pijn voor coins, XP of quest-voortgang.
5. Autorisatie/RLS/privacy- en klinische E2E-tests bij opt-in, intrekking, vriendschap verwijderen, cross-tenant toegang en misbruik.
6. Pas daarna echte gedeelde voortgang in de UI tonen. Geen publieke ranglijst op herstel, kracht of letsel.

De gedeelde pure `aggregateTeamDay` is alleen een testbaar concept; het is **niet aangesloten op echte gegevens of endpoints**, bewust om toestemming en isolatie niet te omzeilen.
