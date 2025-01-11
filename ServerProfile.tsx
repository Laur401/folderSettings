/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {Margins} from "@utils/margins";
import {ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModalLazy} from "@utils/modal";
import {Button, Constants, FluxDispatcher, Forms, Menu, RestAPI, UserStore, useState} from "@webpack/common";

import {getFolderGuilds, ProfileSettings, ToggleTextInput} from "./Components";

async function submitSettings(folderId: string, settings: ProfileSettings) {
    const guilds = getFolderGuilds(folderId);
    const userId = UserStore.getCurrentUser().id;
    const getProfile = async(guildId: string)=>{
        // from utils/discord.tsx
        await FluxDispatcher.dispatch({type: "USER_PROFILE_FETCH_START", userId: userId});
        const { body } = await RestAPI.get({
            url: Constants.Endpoints.USER_PROFILE(userId),
            query: {
                with_mutual_guilds: false,
                with_mutual_friends_count: false,
                guild_id: guildId
            },
            oldFormErrors: true,
        });
        await FluxDispatcher.dispatch({type: "USER_PROFILE_FETCH_SUCCESS", ...body});
        return body;
    };
    for (const guildId of guilds) {
        const body = await getProfile(guildId);
        await FluxDispatcher.dispatch({
            type: "GUILD_IDENTITY_SETTINGS_INIT",
            guild: guildId
        });
        if (settings.nick!==undefined)
            await FluxDispatcher.dispatch({
                type: "GUILD_IDENTITY_SETTINGS_SET_PENDING_NICKNAME",
                nickname: settings.nick
            });
        if (settings.pronouns!==undefined)
            await FluxDispatcher.dispatch({
                type: "GUILD_IDENTITY_SETTINGS_SET_PENDING_PRONOUNS",
                pronouns: settings.pronouns
            });
        await FluxDispatcher.dispatch({
            type: "GUILD_IDENTITY_SETTINGS_SUBMIT"
        });
        await RestAPI.patch({
            url: Constants.Endpoints.SET_GUILD_MEMBER(guildId),
            body: {
                nick: settings.nick,
                pronouns: settings.pronouns
            },
            oldFormErrors: true,
        });
        /* return {
                user_id: t,
                nick: n,
                guild_id: i,
                avatar: r,
                avatar_decoration_data: null != l ? {
                    asset: l.asset,
                    sku_id: l.skuId
                } : null,
                banner: a,
                bio: s,
                pronouns: o,
                color_string: c
            } */
        await FluxDispatcher.dispatch({
            type: "GUILD_IDENTITY_SETTINGS_SUBMIT_SUCCESS"
        });
        const newBody = await getProfile(guildId);
        await FluxDispatcher.dispatch({
            type: "GUILD_MEMBER_PROFILE_UPDATE",
            guildMember: newBody.guild_member,
            guildId: guildId,
        });
    }
}

function ServerProfileSettingsModal({ initialSettings, copySettings }:{ initialSettings: ProfileSettings, copySettings: ProfileSettings }) {
    const [serverProfileSettings, setServerProfileSettings] = useState<ProfileSettings>(initialSettings);
    const settingsChange = (key: keyof ProfileSettings, value: typeof serverProfileSettings[keyof ProfileSettings]) => {
        const newSettings: ProfileSettings = structuredClone(serverProfileSettings);
        newSettings[key]=value;
        copySettings[key]=value;
        setServerProfileSettings(newSettings);
    };
    return(
        <>
            <div className={Margins.top20}/>
            <Forms.FormSection title={"Server Nickname"} className={Margins.bottom20}>
                <ToggleTextInput placeholderText={"Add your nickname"} settingsContainer={serverProfileSettings} settingKey={"nick"} settingsChange={settingsChange}/>
                <Forms.FormDivider className={Margins.top20}/>
            </Forms.FormSection>
            <Forms.FormSection title={"Pronouns"} className={Margins.bottom20}>
                <ToggleTextInput placeholderText={"Add your pronouns"} settingsContainer={serverProfileSettings} settingKey={"pronouns"} settingsChange={settingsChange}/>
                <Forms.FormDivider className={Margins.top20}/>
            </Forms.FormSection>
            <div className={Margins.bottom20}/>
        </>
    );
}

export function buildServerProfileMenuItem(folderId: string, folderName: string){
    const modalSettings: ProfileSettings = {
        nick: undefined,
        pronouns: undefined
    };
    const copySettings: ProfileSettings = structuredClone(modalSettings);
    return(
        <Menu.MenuItem
            id = "folder-server-profile-settings"
            key = "folder-server-profile-settings"
            label = {"Profile Settings"}
            action={()=>
                openModalLazy(async()=>{
                    return modalProps => (
                        <ModalRoot size={ModalSize.SMALL}{...modalProps}>
                            <ModalHeader>
                                <Forms.FormTitle>Server Profile Settings</Forms.FormTitle>
                            </ModalHeader>
                            <ModalContent>
                                <ServerProfileSettingsModal initialSettings={modalSettings} copySettings={copySettings}/>
                            </ModalContent>
                            <ModalFooter>
                                <Button onClick={()=>{ modalProps.onClose; console.log(copySettings); submitSettings(folderId, copySettings); }}>Submit</Button>
                            </ModalFooter>
                        </ModalRoot>
                    );
                }
            )}
        />
    );
}
