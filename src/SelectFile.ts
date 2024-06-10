import {
    App,
    Notice,
    SuggestModal,
    TFile,
} from "obsidian";

import {
    BearingsConfiguration,
} from "./settings";


import {
    getDisplayTitle,
} from "./dataservice";

interface FileDisplayRecord {
  path: string;
  displayTitle: string;
}

export class SelectFileModal extends SuggestModal<FileDisplayRecord> {

    configuration: BearingsConfiguration;
    _allFiles: FileDisplayRecord[];
    onUpdate: (path: string) => void;
    isRegExp: boolean;
    wrapInWildcards: boolean;

    constructor(
        app: App,
        configuration: BearingsConfiguration,
        onUpdate: (path: string) => void,
        isRegExp: boolean = true,
        wrapInWildcards: boolean = true,
    ) {
        super(app);
        this.configuration = configuration;
        this._allFiles = [];
        this.onUpdate = onUpdate;
        this.isRegExp = isRegExp;
        this.wrapInWildcards = wrapInWildcards;
    }

    getSuggestions(query: string): FileDisplayRecord[] {
        const queryTokens = query.toLowerCase().split(/\s+/);
        return this.loadFiles().filter((fileDisplayRecord: FileDisplayRecord) => {
            const title = fileDisplayRecord.displayTitle.toLowerCase();
            const path = fileDisplayRecord.path.toLowerCase();

            if (this.isRegExp) {
                const regexQuery = queryTokens.map(token => {
                    if (this.wrapInWildcards) {
                        return `.*${token}.*`;
                    }
                    return token;
                }).join('|');

                const regex = new RegExp(regexQuery, 'i');
                return regex.test(title) || regex.test(path);
            } else {
                return queryTokens.some(token => title.includes(token) || path.includes(token));
            }
        });
    }

    renderSuggestion(fileDisplayRecord: FileDisplayRecord, el: HTMLElement) {
        el.createEl("div", { text: fileDisplayRecord.displayTitle });
        el.createEl("small", { text: fileDisplayRecord.path });
    }

    onChooseSuggestion(fileDisplayRecord: FileDisplayRecord, evt: MouseEvent | KeyboardEvent) {
        this.onUpdate(fileDisplayRecord.path);
    }

    loadFiles(): FileDisplayRecord[] {
        return this.app.vault
            .getMarkdownFiles()
            .map((file: TFile) => {
                return {
                    path: file.path,
                    displayTitle: getDisplayTitle(
                        this.app,
                        this.configuration,
                        undefined,
                        file,
                        file.path,
                    ),
                };
            })
            .sort((a: FileDisplayRecord, b: FileDisplayRecord) => a.displayTitle.localeCompare(b.displayTitle));
    }

    get allFiles() {
        if (!this._allFiles) {
            this._allFiles = this.loadFiles();
        }
        return this._allFiles;
    }

}

