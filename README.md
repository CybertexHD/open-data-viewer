Open Data Viewer – Beschreibung und Funktionsumfang

Dieses Projekt ist ein interaktiver Karten-Viewer zur Visualisierung und Bearbeitung offener Geodaten. Unterstützt werden die Formate GeoJSON, KML, GPX sowie einfache JSON-Dateien mit Koordinatenangaben. Die Anwendung basiert vollständig auf JavaScript und nutzt die Open-Source-Bibliothek OpenLayers. Sie läuft rein clientseitig im Browser und erfordert keine Backend- oder Serverinfrastruktur.

Nach dem Laden der Anwendung können eine oder mehrere Dateien hochgeladen werden. Die enthaltenen geografischen Objekte werden automatisch erkannt, auf einer OpenStreetMap-Karte angezeigt und mit einem geeigneten Stil versehen – je nach Geometrietyp (Punkt, Linie, Fläche). Hochgeladene Dateien erscheinen zusätzlich in einer Liste mit der Möglichkeit, sie wieder zu entfernen.

Die Anwendung bietet unter anderem folgende Funktionen:
– Unterstützung der Formate GeoJSON, KML, GPX sowie einfacher JSON-Dateien
– Automatische Darstellung aller geladenen Objekte auf einer interaktiven OpenStreetMap-Karte
– Automatische Beschriftung aller Objekte mit dem Dateinamen (ohne Endung) + laufende Nummer bei gleichen Namen
– Beschriftung bleibt auch beim Export erhalten und wird mitgespeichert
– Manuelle Umbenennung einzelner Punkte direkt auf der Karte durch Alt + Klick
– Selektionsfunktion zur Auswahl einzelner Objekte durch Mausklick
– Farbliche Hervorhebung bei Selektion: Selektierte Dinge werden grün gekennzeichnet
– Export aller selektierten Objekte als GeoJSON-Datei
– Export enthält Geometrien und Labels der ausgewählten Features
– Interaktive Dateiliste mit Löschfunktion pro Datei

Hinweise zur Dateistruktur für einfache JSON-Dateien:
Einfache JSON-Dateien müssen ein Array enthalten, in dem jedes Objekt über ein Koordinatenpaar verfügt. Unterstützt werden die Feldbezeichner lat/lon oder latitude/longitude. Optional können zusätzliche Attribute wie name oder info enthalten sein.

Anwendung und lokale Ausführung:
Die Anwendung besteht aus drei zentralen Dateien: index.html (Grundstruktur und Steuerungselemente), style.css (Layout und Erscheinungsbild) und main.js (Funktionslogik). Zur lokalen Ausführung empfiehlt sich die Nutzung von Visual Studio Code in Verbindung mit der Erweiterung „Live Server“. Nach der Installation kann die Datei index.html über „Go Live“ geöffnet werden. Alternativ lässt sich ein einfacher HTTP-Server mit Python starten:
python -m http.server

Diese Anwendung bietet eine kompakte, nutzerfreundliche und vollständig lokal lauffähige Lösung zur Darstellung, Bearbeitung und Verwaltung offener Geodaten.