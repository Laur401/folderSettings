/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Margins } from "@utils/margins";
import { sleep } from "@utils/misc";
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
import { findByPropsLazy } from "@webpack";
import { Button, Forms, MaskedLink, Menu, Text, Toasts, useState } from "@webpack/common";

import { pluginSettings } from ".";
import {
    getFolderGuilds,
    NotificationSettings,
    NotificationSettingsPingsValues,
    ToggleSelect,
    ToggleSwitch
} from "./Components";

const { updateGuildNotificationSettings } = findByPropsLazy("updateGuildNotificationSettings");
const { updateGuildNotificationSettingsBulk } = findByPropsLazy("updateGuildNotificationSettingsBulk");
const queue = new Queue();

async function submitSettings(folderId: string, settings: NotificationSettings){
    const guilds = getFolderGuilds(folderId);
    const settingsList = {
        muted: settings.muted,
        mute_config: {
            selected_time_window: settings.muted_selected_time_window,
            end_time: settings.muted_end_time,
        },
        message_notifications: settings.pings,
        suppress_everyone: settings.everyone,
        suppress_roles: settings.roles,
        notify_highlights: settings.highlights,
        mute_scheduled_events: settings.events,
        mobile_push: settings.mobile,
    };
    if (settingsList.message_notifications===NotificationSettingsPingsValues.DISABLED)
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

function NotificationSettingsModal({ initialSettings, copySettings }: { initialSettings: NotificationSettings, copySettings: NotificationSettings }) {
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(initialSettings);
    const settingsChange = (key: keyof NotificationSettings, value: typeof notificationSettings[keyof NotificationSettings]) => {
        const newSettings: NotificationSettings = structuredClone(notificationSettings);
        // @ts-ignore // linter seemingly gets confused by structuredClone
        newSettings[key] = value;
        // @ts-ignore
        copySettings[key] = value;
        if (key==="muted_selected_time_window" && typeof value === "number") {
            newSettings.muted_end_time=new Date(Date.now()+value*1000).toISOString();
            copySettings.muted_end_time=newSettings.muted_end_time;
        }
        setNotificationSettings(newSettings);
    };
    return(
        <>
            <div className={Margins.top20}/>
            <Forms.FormSection className={Margins.bottom20}>
                <ToggleSwitch settingsContainer={notificationSettings} settingsChange={settingsChange} settingKey={"muted"} hideBorder={true}
                              note={<Forms.FormText>Muting a server prevents unread indicators and notifications from appearing unless you are mentioned.</Forms.FormText>}
                              title={"Mute Server"}/>
                <ToggleSelect settingsContainer={notificationSettings} settingsChange={settingsChange} settingKey={"muted_selected_time_window"}
                              options={[
                                  { label: "For 15 Minutes", value: 900 },
                                  { label: "For 1 Hour", value: 3600 },
                                  { label: "For 3 Hours", value: 10800 },
                                  { label: "For 8 Hours", value: 28800 },
                                  { label: "For 24 Hours", value: 86400 },
                                  { label: "Until I turn it back on", value: -1, default: true },
                              ]}
                              placeholderValue={-1}
                              title={"Mute duration"}/>
                <Forms.FormDivider className={Margins.top20}/>
            </Forms.FormSection>
            {/* TODO: Add Mute duration (handleSelectMuteTime), disable Server notif settings, highlights, mobile notifs */}
            <Forms.FormSection className={Margins.bottom20} title={"Server Notification Settings"}>
                <ToggleSelect settingsContainer={notificationSettings} settingKey={"pings"} settingsChange={settingsChange}
                              options={[
                                  { label: "All Messages", value: NotificationSettingsPingsValues.ALL_MESSAGES },
                                  { label: "Only @Mentions", value: NotificationSettingsPingsValues.ONLY_MENTIONS },
                                  { label: "Nothing", value: NotificationSettingsPingsValues.NO_MESSAGES },
                                  { label: "Server Defaults", value: NotificationSettingsPingsValues.SERVER_DEFAULTS }
                              ]}
                              placeholderValue={NotificationSettingsPingsValues.DISABLED}/>
                <Forms.FormDivider className={Margins.top20}/>
            </Forms.FormSection>
            <Forms.FormSection className={Margins.bottom20}>
                <ToggleSwitch settingsContainer={notificationSettings} settingsChange={settingsChange} settingKey={"everyone"} hideBorder={true}
                              title={"Suppress @everyone and @here"}/>
                <Forms.FormDivider/>
            </Forms.FormSection>
            <Forms.FormSection className={Margins.bottom20}>
                <ToggleSwitch settingsContainer={notificationSettings} settingsChange={settingsChange} settingKey={"roles"} hideBorder={true}
                              title={"Suppress All Role @mentions"}/>
                <Forms.FormDivider/>
            </Forms.FormSection>
            <Forms.FormSection className={Margins.bottom20}>
                <ToggleSwitch settingsContainer={notificationSettings} settingsChange={settingsChange} settingKey={"highlights"} hideBorder={true}
                              note={<div>
                                  <Forms.FormText>Highlights provide occasional updates when your friends are chatting in busy servers and more.</Forms.FormText>
                                  <MaskedLink href={"https://support.discord.com/hc/en-gb/articles/5304469213079"}>Learn more about Highlights</MaskedLink>
                              </div>}
                              title={"Suppress Highlights"}/>
                <Forms.FormDivider/>
            </Forms.FormSection>
            <Forms.FormSection className={Margins.bottom20}>
                <ToggleSwitch settingsContainer={notificationSettings} settingsChange={settingsChange} settingKey={"events"} hideBorder={true}
                              title={"Mute New Events"}/>
                <Forms.FormDivider/>
            </Forms.FormSection>
            <Forms.FormSection className={Margins.bottom20}>
                <ToggleSwitch settingsContainer={notificationSettings} settingsChange={settingsChange} settingKey={"mobile"} hideBorder={true}
                              title={"Mobile Push Notifications"}/>
                <Forms.FormDivider/>
            </Forms.FormSection>
            <div className={Margins.bottom20}/>
        </>
    );
}

export function buildNotificationMenuItem(folderId: string, folderName: string) {
    const modalSettings: NotificationSettings = {
        muted: undefined,
        pings: undefined,
        everyone: undefined,
        roles: undefined,
        highlights: undefined,
        events: undefined,
        mobile: undefined
    };
    const copySettings: NotificationSettings = structuredClone(modalSettings);
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
                                    { folderName&&<Text variant="text-md/normal" >{folderName}</Text> }
                                </div>
                                <ModalCloseButton onClick={modalProps.onClose} />
                            </ModalHeader>
                            <ModalContent>
                                <NotificationSettingsModal initialSettings={modalSettings} copySettings={copySettings}/>
                            </ModalContent>
                            <ModalFooter>
                                <Button onClick={()=> {
                                    console.log(copySettings);
                                    submitSettings(folderId, copySettings);
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
