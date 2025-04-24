import { IAuthorizedRecord } from "./database";

export interface IBaseViewModel {
    assetPrefix: string,
    title: string,
}

export interface ILoginViewModel extends IBaseViewModel {
    description: string,
    mainText: string,
    authLink?: string,
    authBtnText?: string,
}

export interface ISuccessViewModel extends IBaseViewModel {
    description: string,
    mainText: string,
}

export interface IErrorViewModel extends IBaseViewModel {
    errorDescription: string,
    errorTitle: string,
    statusCode: number,
    errorText: string,
    errorId?: string,
    logsLink?: string,
}

export interface IAdminLoginViewModel extends IBaseViewModel {
    loginTitle: string,
    loginSubmitBtnText: string,
    loginTokenName: string,
}

export interface IAdminPanelViewModel extends IBaseViewModel {
    records: IAuthorizedRecord[] | null,
    panelDeleteBtnText: string,
    panelSubmitBtnText: string,
    currentPage: number,
    panelTitle: string,
    prevPage: string,
    nextPage: string,
}