/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Credits: betterFolders, emoteCloner, newGuildSettings, validUser

import "./index.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

import { buildNotificationMenuItem } from "./NotificationSettings";
import { buildPrivacyMenuItem } from "./PrivacySettings";



const guildContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    const { folderId, folderName } = props ?? {};
    if (!folderId) return;

    const notificationMenuItem = (() => {
        return buildNotificationMenuItem(folderId, folderName);
    })();
    const privacyMenuItem = (() => {
        return buildPrivacyMenuItem(folderId);
    })();

    if (notificationMenuItem)
        findGroupChildrenByChildId("mark-folder-read", children)?.push(notificationMenuItem, privacyMenuItem);
};

export const pluginSettings = definePluginSettings({
    method: {
        description: "Update method to use. Bulk is faster, but seemingly unused by Discord and thus may be removed in the future.",
        type: OptionType.SELECT,
        options: [
            { label: "updateGuildNotificationSettings", value: 0, default: true },
            { label: "updateGuildNotificationSettingsBulk", value: 1 }
        ]
    },
    timeout: {
        description: "Amount of time (in milliseconds) to wait between notification setting calls. Does nothing if update method is set to Bulk. Don't set it below 1000.",
        type: OptionType.NUMBER,
        default: 1000,
        disabled: () => pluginSettings.store.method===1
    }
});

export default definePlugin({
    name: "FolderSettings",
    description: "Change settings of all servers in a folder.",
    authors: [{ name: "Laur401", id: 220619993434423296n }],
    contextMenus: {
        "guild-context": guildContextMenuPatch
    },
    settings: pluginSettings,
    dependencies: ["UserSettingsAPI", "ContextMenuAPI"],
});


