# FiveFind extension: Chrome Web Store listing

Everything to fill in on https://chrome.google.com/webstore/devconsole for the FiveFind extension.
The zip to upload is the asset of the matching GitHub Release (`fivefind-extension-v<version>`), or
run `npm run bundle:extension` in `fivefind/`.

## Files in this folder

| File | Where it goes | Spec |
|---|---|---|
| `store-icon-128.png` | Store listing → Store icon | 128×128 PNG (96px artwork + 16px transparent padding) |
| `screenshot-1-map.png`, `screenshot-2-list.png`, `screenshot-3-popup.png` | Store listing → Screenshots | 1280×800 PNG, no transparency (1 required, up to 5) |
| `promo-tile-440x280.png` | Store listing → Small promo tile | 440×280. Optional: shown when the store features or lists the extension |

## Package

- **Summary** (from the manifest `description`, max 132 chars): Ouvre sur lefive.fr le créneau choisi dans FiveFind. Projet indépendant, non affilié à LE FIVE.

## Store listing

- **Category:** Tools (Outils)
- **Language:** French
- **Homepage URL:** https://badyass.xyz/projects/fivefind/
- **Support URL:** https://github.com/YBadiss/badyass/issues

**Description:**

```
FiveFind (https://badyass.xyz/projects/fivefind/) affiche en direct les terrains de foot à 5 libres dans les centres LE FIVE, sur une carte et en liste, pour plusieurs centres et plusieurs jours à la fois.

Cette extension complète le site : quand vous cliquez sur « Ouvrir le créneau » dans FiveFind, lefive.fr s'ouvre directement sur ce créneau, prêt à être réservé. Sans l'extension, le lien ouvre seulement la page du centre et il faut retrouver le jour et l'heure soi-même.

• Fonctionne même si vous devez d'abord vous connecter à lefive.fr
• Un bouton « Voir toute la journée » pour revenir à tous les créneaux du jour
• Aucune donnée collectée, aucun compte, aucune publicité

FiveFind est un projet personnel et indépendant. Il n'est pas affilié à LE FIVE, ni approuvé par LE FIVE. La réservation et le paiement se font toujours sur lefive.fr.
```

## Privacy practices

- **Single purpose:**
  ```
  Ouvrir sur lefive.fr le créneau de foot à 5 choisi dans le site FiveFind (badyass.xyz/projects/fivefind), pour le réserver directement.
  ```
- **Host permission justification** (the content scripts' `matches`):
  ```
  www.lefive.fr : lire le créneau choisi dans le lien ouvert depuis FiveFind et afficher ce créneau sur la page de réservation de lefive.fr.
  badyass.xyz/projects/fivefind : indiquer au site FiveFind que l'extension est installée (et sa version), pour qu'il propose « Ouvrir le créneau » au lieu de l'installation.
  ```
- **Are you using remote code?** No. All JavaScript is in the package.
- **Data usage:** tick none of the data types. Certify all three statements: no selling or transferring data to third parties, no use unrelated to the single purpose, no use for creditworthiness or lending.
- **Privacy policy URL:** https://badyass.xyz/fivefind/privacy (redirects to https://badyass.xyz/projects/fivefind/privacy/)

## Distribution

- **Visibility:** Unlisted. FiveFind links to it; it won't appear in store search.
- **Regions:** all regions (LE FIVE is in France, but nothing breaks elsewhere).

## After approval

1. Note the item ID and the store URL (`https://chromewebstore.google.com/detail/<id>`).
2. Point `ExtensionBanner.vue` at the store URL instead of the GitHub Release zip.
3. Remove any unpacked copy of the extension, otherwise both run on lefive.fr.
4. For each update: bump `version` in `extension/manifest.json`, push (the release workflow builds the zip), and upload that zip in the dashboard.
