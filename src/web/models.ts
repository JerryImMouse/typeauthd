import { Response } from 'express';
import { LocaleManager } from '../locale';
import { IAdminLoginViewModel, IAdminPanelViewModel, IErrorViewModel, ILoginViewModel, ISuccessViewModel } from '../types/models';
import { Configration } from '../config';
import { IAuthorizedRecord } from '../types/database';

const config = Configration.get();

export class LoginViewModel {
    static descriptionLocKey = "auth_required_details";
    static mainTextLocKey = "auth_required";
    static authBtnTextLocKey = "auth_btn";

    static viewName = "login";

    private _inner: ILoginViewModel;

    constructor(locMan: LocaleManager, authLink?: string, locale?: string) {
        this._inner = {
            description: locMan.loc(LoginViewModel.descriptionLocKey, locale),
            authBtnText: locMan.loc(LoginViewModel.authBtnTextLocKey, locale),
            mainText: locMan.loc(LoginViewModel.mainTextLocKey, locale),
            assetPrefix: config.pathBase,
            authLink: authLink,
            title: "Login"
        }
    }

    public respond(res: Response) {
        res.render(LoginViewModel.viewName, {model: this._inner});
    }
}

export class SuccessViewModel {
    private static descriptionLocKey = "auth_success_details";
    private static mainTextLocKey = "auth_success";

    private static viewName = "success";

    private _inner: ISuccessViewModel;

    constructor(locMan: LocaleManager, locale?: string) {
        this._inner = {
            description: locMan.loc(SuccessViewModel.descriptionLocKey, locale),
            mainText: locMan.loc(SuccessViewModel.mainTextLocKey, locale),
            assetPrefix: config.pathBase,
            title: "Success",
        }
    }

    public respond(res: Response) {
        res.render(SuccessViewModel.viewName, {model: this._inner})
    }
}

export class ErrorViewModel {
    private static errTextLocKey = "error_title";
    private static viewName = "error";

    private _inner: IErrorViewModel;

    constructor(
        locMan: LocaleManager,
        errDescLocKey: string,
        errTitleLocKey: string,
        statusCode: number,
        logsLink?: string,
        errorId?: string,
        locale?: string
    ) {
        this._inner = {
            errorTitle: locMan.loc(ErrorViewModel.errTextLocKey, locale),
            errorDescription: locMan.loc(errDescLocKey, locale),
            errorText: locMan.loc(errTitleLocKey, locale),
            assetPrefix: config.pathBase,
            title: "Error",
            statusCode,
            logsLink,
            errorId,
        }
    }

    public respond(res: Response) {
        res.render(ErrorViewModel.viewName, {model: this._inner});
    }
}

export class AdminLoginViewModel {
    private static loginTitleLocKey = "login_title";
    private static loginSubmitBtnLocKey = "login_submit_btn";
    private static loginTokenNameLocKey = "login_token_name";

    private static viewName = "admin_login";

    private _inner: IAdminLoginViewModel;

    constructor(locMan: LocaleManager, locale?: string) {
        this._inner = {
            loginSubmitBtnText: locMan.loc(AdminLoginViewModel.loginSubmitBtnLocKey, locale),
            loginTokenName: locMan.loc(AdminLoginViewModel.loginTokenNameLocKey, locale),
            loginTitle: locMan.loc(AdminLoginViewModel.loginTitleLocKey, locale),
            assetPrefix: config.pathBase,
            title: "Login",
        }
    }

    public respond(res: Response) {
        res.render(AdminLoginViewModel.viewName, {model: this._inner});
    }
}

export class AdminPanelViewModel {
    private static panelDeleteBtnTextLocKey = "panel_delete_btn";
    private static panelSubmitBtnTextLocKey = "panel_submit_btn";
    private static panelTitleLocKey = "panel_title";
    
    private static viewName = "admin_panel";

    private _inner: IAdminPanelViewModel;

    constructor(
        locMan: LocaleManager,
        currentPage: number,
        prevPage: string,
        nextPage: string,
        records: IAuthorizedRecord[] | null,
        locale?: string,
    ) {
        this._inner = {
            panelDeleteBtnText: locMan.loc(AdminPanelViewModel.panelDeleteBtnTextLocKey, locale),
            panelSubmitBtnText: locMan.loc(AdminPanelViewModel.panelSubmitBtnTextLocKey, locale),
            panelTitle: locMan.loc(AdminPanelViewModel.panelTitleLocKey, locale),
            assetPrefix: config.pathBase,
            title: "Panel",
            currentPage,
            prevPage,
            nextPage,
            records,
        }
    }

    public respond(res: Response) {
        res.render(AdminPanelViewModel.viewName, {model: this._inner});
    }
}