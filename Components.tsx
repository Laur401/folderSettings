/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { identity } from "@utils/misc";
import { findStoreLazy } from "@webpack";
import {Flex, Forms, Select, Switch, TextInput} from "@webpack/common";
import { SelectOption } from "@webpack/types";
import {CheckedTextInput} from "@components/CheckedTextInput";


export interface NotificationSettings{
    muted?: boolean,
    muted_selected_time_window?: number,
    muted_end_time?: string,
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

export interface ProfileSettings{
    nick?: string,
    pronouns?: string
}

type Settings = NotificationSettings | PrivacySettings | ProfileSettings;
type keysOfUnion<T> = T extends T ? keyof T : never;

export function ToggleSwitch<T extends Settings>({ settingsContainer, settingKey, settingsChange, hideBorder, note, title }:{ settingsContainer: T, settingKey: keysOfUnion<T>, settingsChange: (key: keysOfUnion<T>, value: any)=>void, hideBorder?: boolean, note?: React.ReactNode, title?: string }){
    const handleCheckboxChange = (checked: boolean)=>{ return checked ? true : undefined; };
    return (
        <Flex flexDirection={"row"} style={{ gap: "0.5em" }}>
            <input type={"checkbox"}
                   style={{ alignSelf: "flex-start", width: "16px", height: "16px" , minWidth: "16px" }}
                   onChange={v => settingsChange(settingKey, handleCheckboxChange(v.target.checked))}/>
            <Switch value={settingsContainer[settingKey] as unknown as boolean ?? false}
                    disabled={settingsContainer[settingKey] === undefined}
                    onChange={v => settingsChange(settingKey, v)}
                    hideBorder={hideBorder}
                    note={note}
                    style={{ flexGrow: 1 }}>
                {title}</Switch>
        </Flex>
    );
}

export function ToggleSelect<T extends Settings>({ settingsContainer, settingKey, settingsChange, placeholderValue, options, title }:{ settingsContainer: T, settingKey: keysOfUnion<T>, settingsChange: (key: keysOfUnion<T>, value: any)=>void, placeholderValue: any, options: SelectOption[], title?: string }){
    const handleCheckboxChange = (checked: boolean)=>{ return checked ? placeholderValue : undefined; };
    return(
        <Flex flexDirection={"row"} style={{ gap: "0.5em" }}>
            <input type={"checkbox"}
                   style={{ alignSelf: "flex-start", width: "16px", height: "16px", minWidth: "16px" }}
                   onChange={v => settingsChange(settingKey, handleCheckboxChange(v.target.checked))}/>
            { title && <Forms.FormTitle disabled={settingsContainer[settingKey] === undefined} tag={"h3"} className={"flexFill"}>{title}</Forms.FormTitle> }
            <Select placeholder="Select a Setting..."
                    options={options}
                    select={v => settingsChange(settingKey,v)}
                    isSelected={v => v === settingsContainer[settingKey]}
                    isDisabled={settingsContainer[settingKey] === undefined}
                    className={"flexFill"}
                    serialize={identity} />
        </Flex>
    );
}

export function ToggleTextInput<T extends Settings>({ settingsContainer, settingKey, settingsChange, placeholderText}:{settingsContainer: T, settingKey: keysOfUnion<T>, settingsChange: (key: keysOfUnion<T>, value: any)=>void, placeholderText: string}){
    const handleCheckboxChange = (checked: boolean)=>{ return checked ? null : undefined; };
    return(
        <Flex flexDirection={"row"} style={{gap: "0.5em"}}>
            <input type={"checkbox"}
                   style={{alignSelf: "flex-start", width: "16px", height: "16px", minWidth: "16px"}}
                   onChange={v => settingsChange(settingKey, handleCheckboxChange(v.target.checked))}/>
            <TextInput
                placeholder={placeholderText}
                onChange={v => settingsChange(settingKey, v)}
                editable={settingsContainer[settingKey] !== undefined}
                className={"flexFill"}/>
        </Flex>
    );
}

const SortedGuildStore = findStoreLazy("SortedGuildStore");

export function getFolderGuilds(id: string) {
    return SortedGuildStore.getGuildFolderById(id).guildIds;
}

// settingsContainer
// settingsKey
// settingsChange(settingsKey, settingsValue-internal)
