# Team Data Sync (Code + Magento Data)

This workflow helps every team member see the same products/images on frontend.

## What to share

1. Push code with Git (frontend + backend scripts/config).
2. Export and share Magento data snapshot (database + media files).

Do not commit SQL/media snapshots to Git by default.
Use shared storage (Drive, S3, internal NAS), then each member imports locally.

## On data owner machine (export)

From project root:

bin/team-data-export

Outputs are created in:

template/dev/team-data/

Main files:

- latest-db.sql.gz
- latest-media.tar.gz
- latest-manifest.txt

Upload these files to your team shared storage.

## On each team member machine (import)

1. Pull latest code from Git.
2. Download snapshot files and place them into:

   template/dev/team-data/

3. Start containers:

   bin/start

4. Import snapshot:

   bin/team-data-import

5. Start frontend and tunnel if needed:

   bin/public-up

## Optional: use custom folder

Export to custom path:

bin/team-data-export /path/to/output

Import from custom path:

bin/team-data-import /path/to/output

## Notes

- If snapshots include sensitive data, sanitize before sharing.
- If database schema changed significantly, re-run:

  bin/magento setup:upgrade

- For very large media folders, consider storing snapshots outside Git with versioned naming.
