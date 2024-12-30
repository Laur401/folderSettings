/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { identity } from "@utils/misc";
import { findStoreLazy } from "@webpack";
import { Flex, Select, Switch } from "@webpack/common";
import { SelectOption } from "@webpack/types";


export interface NotificationSettings{
    muted?: boolean,
    pings?: NotificationSettingsPingsValues,
    everyone?: boolean,
    roles?: boolean,
    highlights?: boolean,
    events?: boolean,
    mobile?: boolean,
}
export enum NotificationSettingsPingsValues{
    "ALL_MESSAGES",
    "ONLY_MENTIONS",
    "NO_MESSAGES",
    "SERVER_DEFAULTS",
    "DISABLED"
}

export interface PrivacySettings{
    directMessages?: boolean,
    messageRequests?: boolean,
    activityStatus?: boolean,
    activityJoining?: boolean
}

type Settings = NotificationSettings | PrivacySettings;
type keysOfUnion<T> = T extends T ? keyof T: never;

export function ToggleSwitch<T extends Settings>({ settingsContainer, settingKey, settingsChange, note, title }:{ settingsContainer: T, settingKey: keysOfUnion<T>, settingsChange: (key: keysOfUnion<T>, value: boolean | undefined)=>void, note?: React.ReactNode, title?: string }){
    const handleCheckboxChange = (checked: boolean)=>{ return checked ? true : undefined; };
    return (
        <Flex flexDirection={"row"} style={{ gap: "0.5em" }}>
            <input type={"checkbox"}
                   style={{ alignSelf: "flex-start", width: "16px", height: "16px" , minWidth: "16px" }}
                   onChange={v => settingsChange(settingKey, handleCheckboxChange(v.target.checked))}/>
            <Switch value={settingsContainer[settingKey] as unknown as boolean ?? false}
                    disabled={settingsContainer[settingKey] === undefined}
                    onChange={v => settingsChange(settingKey, v)}
                    note={note}
                    style={{ flexGrow: 1 }}>
                {title}</Switch>
        </Flex>
    );
}

export function ToggleSelect<T extends Settings>({ settingsContainer, settingKey, settingsChange, options }:{ settingsContainer: T, settingKey: keyof T, settingsChange, options: SelectOption[] }){
    const handleCheckboxChange = (checked: boolean)=>{ return checked ? NotificationSettingsPingsValues.DISABLED : undefined; };
    return(
        <Flex flexDirection={"row"} style={{ gap: "0.5em" }}>
            <input type={"checkbox"}
                   style={{ alignSelf: "flex-start", width: "16px", height: "16px" }}
                   onChange={v => settingsChange(settingKey, handleCheckboxChange(v.target.checked))}/>
            <Select placeholder="Select a Setting..."
                    options={options}
                    select={v => settingsChange("pings",v)}
                    isSelected={v => v === settingsContainer[settingKey]}
                    isDisabled={settingsContainer[settingKey] === undefined}
                    className={"flexFill"}
                    serialize={identity}>Server Notification Settings</Select>
        </Flex>
    );
}

const SortedGuildStore = findStoreLazy("SortedGuildStore");
export function getFolderGuilds(id: string){
    return SortedGuildStore.getGuildFolderById(id).guildIds;
}

// settingsContainer
// settingsKey
// settingsChange(settingsKey, settingsValue-internal)
