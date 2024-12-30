/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getUserSettingLazy } from "@api/UserSettings";
import { Margins } from "@utils/margins";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModalLazy } from "@utils/modal";
import { Queue } from "@utils/Queue";
import { Button, Forms, MaskedLink, Menu, useState } from "@webpack/common";

import { getFolderGuilds, PrivacySettings, ToggleSwitch } from "./Components";


const DirectMessageSetting = getUserSettingLazy("privacy", "restrictedGuildIds");
const MessageRequestSetting = getUserSettingLazy("privacy", "messageRequestRestrictedGuildIds");
const ActivityStatusSetting = getUserSettingLazy("privacy", "activityRestrictedGuildIds");
const ActivityJoiningSetting = getUserSettingLazy("privacy", "activityJoiningRestrictedGuildIds");
// activityRestrictedGuildIds, activityJoiningRestrictedGuildIds, messageRequestRestrictedGuildIds
const queue = new Queue();

function updateUserSetting(setting, settingToSetTo: boolean | undefined, guilds: string[]){
    if (settingToSetTo===undefined) return;
    const oldSetting = setting.getSetting();
    const newSet = new Set(oldSetting);
    if (settingToSetTo) {
        for (const guildId of guilds) {
            newSet.delete(guildId);
            queue.push(setting.updateSetting([...newSet]));
        }
    }
    else {
        for (const guildId of guilds) {
            newSet.add(guildId);
            queue.push(setting.updateSetting([...newSet]));
        }
    }
}

function submitSettings(folderId: string, settings: PrivacySettings){
    if ([DirectMessageSetting, MessageRequestSetting, ActivityStatusSetting, ActivityJoiningSetting].some(n=>n===undefined)) return;
    const guilds = getFolderGuilds(folderId);
    console.log(settings);
    // off = add, on = remove
    updateUserSetting(DirectMessageSetting, settings.directMessages, guilds);
    updateUserSetting(MessageRequestSetting, settings.messageRequests, guilds);
    updateUserSetting(ActivityStatusSetting, settings.activityStatus, guilds);
    updateUserSetting(ActivityJoiningSetting, settings.activityJoining, guilds);
}
// const [unused,forceUpdate]=useReducer(n=>n+1, 0);



function PrivacySettingsModal({ initialSettings, copySettings }:{ initialSettings: PrivacySettings, copySettings: PrivacySettings }){
    const [modalSettings, setModalSettings] = useState<PrivacySettings>(initialSettings);
    const settingsChange = (key: keyof PrivacySettings, value: typeof modalSettings[keyof PrivacySettings]) => {
        const newSettings = structuredClone(modalSettings);
        newSettings[key] = value;
        copySettings[key] = value;
        setModalSettings(newSettings);
        console.log(newSettings);
        console.log(modalSettings);
    };
    return(
        <>
            <div className={Margins.top20}/>
            <ToggleSwitch<PrivacySettings> settingsContainer={modalSettings} settingKey={"directMessages"} settingsChange={settingsChange}
                          title={"Direct Messages"}
                          note={<Forms.FormText>Allow direct messages from other members in this server.</Forms.FormText>}/>
            {/* TODO: Disable Message Requests if Direct Messages are disabled */}
            <ToggleSwitch settingsContainer={modalSettings} settingKey={"messageRequests"} settingsChange={settingsChange}
                          title={"Message Requests"}
                          note={<Forms.FormText>If direct messages are enabled, filter messages from server members you may not know. <MaskedLink href={"https://support.discord.com/hc/en-gb/articles/7924992471191"}>Learn more about this setting here.</MaskedLink></Forms.FormText>}/>
            <ToggleSwitch settingsContainer={modalSettings} settingKey={"activityStatus"} settingsChange={settingsChange}
                          title={"Activity Status"}
                          note={<Forms.FormText>Share your activity status in this server. <MaskedLink href={"https://support.discord.com/hc/en-gb/articles/7931156448919"}>Learn more about this setting here.</MaskedLink></Forms.FormText>}/>
            <ToggleSwitch settingsContainer={modalSettings} settingKey={"activityJoining"} settingsChange={settingsChange}
                          title={"Activity Joining"}
                          note={<Forms.FormText>Allow users to join your activity in this server. <MaskedLink href={"https://support.discord.com/hc/en-gb/articles/7931156448919"}>Learn more about this setting here.</MaskedLink></Forms.FormText>}/>
            <div className={Margins.bottom20}/>
        </>
    );
}

export function buildPrivacyMenuItem(folderId: string){
    const modalSettings: PrivacySettings = {
        directMessages: undefined,
        messageRequests: undefined,
        activityStatus: undefined,
        activityJoining: undefined
    };
    const copySettings = structuredClone(modalSettings);
    return(
        <Menu.MenuItem
            id = "folder-server-privacy-settings"
            key = "folder-server-privacy-settings"
            label = {"Privacy Settings"}
            action = {()=>
                openModalLazy(async()=> {
                    return modalProps => (
                        <ModalRoot size={ModalSize.SMALL}{...modalProps}>
                            <ModalHeader>
                                <Forms.FormTitle tag={"h1"} style={{ marginBottom: 0 }}>Privacy Settings</Forms.FormTitle>
                            </ModalHeader>
                            <ModalContent>
                                <PrivacySettingsModal initialSettings={modalSettings} copySettings={copySettings}/>
                            </ModalContent>
                            <ModalFooter>
                                <Button onClick={() => {
                                    console.log(copySettings);
                                    submitSettings(folderId, copySettings);
                                }}>Submit</Button>
                            </ModalFooter>
                        </ModalRoot>
                    );
                })
            }
        />
    );
}
