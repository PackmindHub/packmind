# Amplitude adoption — last 15 listener events (Packmind V3 [CLOUD], Last 30 Days)

Excluded orgs: `AI Configuration orga`, `test_package_standards`, `packmind`, `Joan's orga`, `demo-orga`, `VIncent test`, `cedric.teyton's organization`, `cedric-test`, `test-skills`.

Excluded events: `user_signed_in`, `user_signed_up`, `new_organization_created`.

Events covered (newest → oldest by listener subscription): `plugin_publish_attempted`, `plugin_published`, `plugin_publish_failed`, `marketplace_plugin_removal_initiated`, `marketplace_linked`, `marketplace_unlinked`, `plugin_rendered`, `plugin_deleted`, `space_pinned`, `space_unpinned`, `space_renamed`, `space_deleted`, `space_members_role_updated`, `space_members_removed`, `space_members_added`.

Note: `plugin_publish_failed` and `marketplace_plugin_removal_initiated` are fully wired (emit + listener subscription) but absent from the Amplitude schema — meaning the underlying action simply **never occurred in prod** in this window (zero publish failures, zero plugin removals). Not dead code; reported as zero-adoption.

## Domain: space

- space_deleted (2 orgs): DiliTrust CLM-MM (1), Matmut (1)
- space_members_added (4 orgs): DiliTrust CLM-MM (6), Optimetriks (3), Tschoener's orga (3), bloomcredit (1)
- space_members_role_updated (1 org): Tschoener's orga (3)
- space_renamed (1 org): Matmut (1)
- space_pinned (2 orgs): Tschoener's orga (4), DiliTrust CLM-MM (2)
- space_unpinned (1 org): DiliTrust CLM-MM (2)
- No adoption (0 orgs): space_members_removed

## Domain: plugin

- No adoption (0 orgs): plugin_rendered, plugin_deleted, plugin_publish_attempted, plugin_published, plugin_publish_failed

## Domain: marketplace

- No adoption (0 orgs): marketplace_linked, marketplace_unlinked, marketplace_plugin_removal_initiated

Source chart: [Open in Amplitude](https://app.eu.amplitude.com/analytics/packmind/chart/new/e-iyolq2p9?utm_source=mcp&utm_content=%5BMCP%5D+Claude+Code+%28amplitude%29)
