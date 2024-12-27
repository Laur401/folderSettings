/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Credits: betterFolders, emoteCloner, newGuildSettings, validUser

import "./index.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Margins } from "@utils/margins";
import { identity, sleep } from "@utils/misc";
import {
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalRoot,
    ModalSize,
    openModalLazy
} from "@utils/modal";
import { Queue } from "@utils/Queue";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { Button, Flex, Forms, MaskedLink,Menu, Select, Switch, Text, Toasts, useState } from "@webpack/common";
import {getUserSettingLazy} from "@api/UserSettings";

interface Settings{
    notifications: {
        muted?: boolean,
        pings?: NotificationSettings,
        everyone?: boolean,
        roles?: boolean,
        highlights?: boolean,
        events?: boolean,
        mobile?: boolean,
    }
}
enum NotificationSettings{
    "ALL_MESSAGES",
    "ONLY_MENTIONS",
    "NO_MESSAGES",
    "SERVER_DEFAULTS",
    "DISABLED"
}

const SortedGuildStore = findStoreLazy("SortedGuildStore");
const { updateGuildNotificationSettings } = findByPropsLazy("updateGuildNotificationSettings");
const { updateGuildNotificationSettingsBulk } = findByPropsLazy("updateGuildNotificationSettingsBulk");
const queue = new Queue();

getUserSettingLazy("privacy", "restrictedGuildIds");
// activityRestrictedGuildIds, activityJoiningRestrictedGuildIds, messageRequestRestrictedGuildIds

function getFolderGuilds(id: string){
    return SortedGuildStore.getGuildFolderById(id).guildIds;
}

async function submitSettings(folderId: string, settings: Settings){
    const guilds = getFolderGuilds(folderId);
    const settingsList = {
        muted: settings.notifications.muted,
        message_notifications: settings.notifications.pings,
        suppress_everyone: settings.notifications.everyone,
        suppress_roles: settings.notifications.roles,
        notify_highlights: settings.notifications.highlights,
        mute_scheduled_events: settings.notifications.events,
        mobile_push: settings.notifications.mobile,
    };
    if (settingsList.message_notifications===NotificationSettings.DISABLED)
        delete settingsList.message_notifications;
    for (const key of Object.keys(settingsList))
        if (settingsList[key]===undefined)
            delete settingsList[key];
    const updateGuild = async (guildId: string) => {
        await sleep(pluginSettings.store.timeout); // For rate limit, would love to replace it with the 429 message's "retry_after", but I have no idea how to get it.
        updateGuildNotificationSettings(guildId, settingsList);
        if (queue.size===0)
            Toasts.show({
                id: Toasts.genId(),
                message: "Notification settings in folder set successfully!",
                type: Toasts.Type.SUCCESS });
    };
    if (pluginSettings.store.method===1){
        const settingsPackage = {};
        for (const guildId of guilds){
            settingsPackage[guildId]=settingsList;
        }
        updateGuildNotificationSettingsBulk(settingsPackage);
        Toasts.show({
            id: Toasts.genId(),
            message: "Notification settings in folder set successfully!",
            type: Toasts.Type.SUCCESS }); // TODO: Figure out how to check it actually is set successfully.
    }
    else {
        for (const guildId of guilds){
            queue.push(()=>updateGuild(guildId));
        }
    }
}
function ToggleSwitch({ settings, settingsChange, settingKey, note, title }:{ settings: Settings, settingsChange: (key: keyof Settings["notifications"], value: boolean | undefined) => void, settingKey: keyof Settings["notifications"], note?: React.ReactNode, title?: string }){
    return (
        <Flex flexDirection={"row"} style={{ gap: "0.5em" }}>
            <input type={"checkbox"}
                   style={{ alignSelf: "flex-start", width: "16px", height: "16px" }}
                   onChange={v => settingsChange(settingKey, (v.target.checked ? true : undefined))}/>
            <Switch value={settings.notifications[settingKey] as unknown as boolean ?? false}
                    disabled={settings.notifications[settingKey] === undefined}
                    onChange={v => settingsChange(settingKey, v)}
                    note={note}
                    style={{ flexGrow: 1 }}>
                {title}</Switch>
        </Flex>
    );
}

function NotificationSettingsModal({ initialSettings }: { initialSettings: Settings }) {
    const [settings, setSettings] = useState<Settings>(initialSettings);
    const settingsChange = (key: keyof Settings["notifications"], value: typeof settings.notifications[keyof Settings["notifications"]]) => {
        const newSettings = Object.create(settings);
        newSettings.notifications[key] = value;
        setSettings(newSettings);
    };
    return(
        <>
            <div className={Margins.top20}/>
            <ToggleSwitch settings={settings} settingsChange={settingsChange} settingKey={"muted"}
                          note={<Forms.FormText>Muting a server prevents unread indicators and notifications from appearing unless you are mentioned.</Forms.FormText>}
                          title={"Mute Server"}/>
            {/* TODO: Add Mute duration (handleSelectMuteTime), disable Server notif settings, highlights, mobile notifs */}
            <Forms.FormSection className={Margins.bottom20} title={"Server Notification Settings"}>
                <Flex flexDirection={"row"} style={{ gap: "0.5em" }}>
                    <input type={"checkbox"}
                           style={{ alignSelf: "flex-start", width: "16px", height: "16px" }}
                           onChange={v => settingsChange("pings", (v.target.checked ? NotificationSettings.DISABLED : undefined))}/>
                    <Select placeholder="Select a Setting..."
                            options={[
                                { label: "All Messages", value: NotificationSettings.ALL_MESSAGES },
                                { label: "Only @Mentions", value: NotificationSettings.ONLY_MENTIONS },
                                { label: "Nothing", value: NotificationSettings.NO_MESSAGES },
                                { label: "Server Defaults", value: NotificationSettings.SERVER_DEFAULTS }
                            ]}
                            select={v => settings.notifications.pings = v}
                            isSelected={v => v === settings.notifications.pings}
                            isDisabled={settings.notifications.pings === undefined}
                            className={"flexFill"}
                            serialize={identity}>Server Notification Settings</Select>
                </Flex>
                <Forms.FormDivider className={Margins.top20}/>
            </Forms.FormSection>
            <ToggleSwitch settings={settings} settingsChange={settingsChange} settingKey={"everyone"}
                          title={"Suppress @everyone and @here"}/>
            <ToggleSwitch settings={settings} settingsChange={settingsChange} settingKey={"roles"}
                          title={"Suppress All Role @mentions"}/>
            <ToggleSwitch settings={settings} settingsChange={settingsChange} settingKey={"highlights"}
                          note={<div>
                              <Forms.FormText>Highlights provide occasional updates when your friends are chatting in busy servers and more.</Forms.FormText>
                              <MaskedLink href={"https://support.discord.com/hc/en-gb/articles/5304469213079"}>Learn more about Highlights</MaskedLink>
                          </div>}
                          title={"Suppress Highlights"}/>
            <ToggleSwitch settings={settings} settingsChange={settingsChange} settingKey={"events"}
                          title={"Mute New Events"}/>
            <ToggleSwitch settings={settings} settingsChange={settingsChange} settingKey={"mobile"}
                          title={"Mobile Push Notifications"}/>
            <div className={Margins.bottom20}/>
        </>
    );
}

function Subtitle({ folderName }:{ folderName:string }){
    if (folderName===undefined)
        return null;
    /* <Forms.FormTitle tag="h3" style={{marginBottom:0}}>{folderName}</Forms.FormTitle> */
    return <Text variant="text-md/normal" >{folderName}</Text>;
}

function buildMenuItem(folderId: string, folderName: string) {
    const modalSettings: Settings = { notifications: {
            muted: undefined,
            pings: undefined,
            everyone: undefined,
            roles: undefined,
            highlights: undefined,
            events: undefined,
            mobile: undefined
        }
    };
    return(
        <Menu.MenuItem
            id = "folder-server-notification-settings"
            key = "folder-server-notification-settings"
            label = {"Notification Settings"}
            action = {()=>
                openModalLazy(async()=>{
                    return modalProps => (
                        <ModalRoot size={ModalSize.MEDIUM}{...modalProps}>
                            <ModalHeader>
                                <div style={{ flexGrow:1, flexShrink:1, flexBasis:0 }}>
                                    <Forms.FormTitle tag="h1" style={{ marginBottom:0 }}>Notification Settings</Forms.FormTitle>
                                    <Subtitle folderName={folderName} />
                                </div>
                                <ModalCloseButton onClick={modalProps.onClose} />
                            </ModalHeader>
                            <ModalContent>
                                <NotificationSettingsModal initialSettings={modalSettings}/>
                            </ModalContent>
                            <ModalFooter>
                                <Button onClick={()=> {
                                    submitSettings(folderId, modalSettings);
                                    Toasts.show({
                                        type: Toasts.Type.MESSAGE,
                                        message: `Setting notification settings in folder${folderName ? " "+folderName : ""}...`,
                                        id: Toasts.genId()
                                    });
                                    modalProps.onClose();
                                }}>Submit</Button>
                            </ModalFooter>
                        </ModalRoot>
                    );
                })
            }
        />
    );
}

const guildContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    const { folderId, folderName } = props ?? {};
    if (!folderId) return;

    const menuItem = (() => {
            return buildMenuItem(folderId, folderName);
        }
    )();

    if (menuItem)
        findGroupChildrenByChildId("mark-folder-read", children)?.push(menuItem);
};

const pluginSettings = definePluginSettings({
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


