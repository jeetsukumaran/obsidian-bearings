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
    isWrapInWildcards: boolean;

    constructor(
        app: App,
        configuration: BearingsConfiguration,
        onUpdate: (path: string) => void,
        isRegExp: boolean = false,
        isWrapInWildcards: boolean = false,
    ) {
        super(app);
        this.configuration = configuration;
        this._allFiles = [];
        this.onUpdate = onUpdate;
        this.isRegExp = isRegExp;
        this.isWrapInWildcards = isWrapInWildcards;
    }

    getSuggestions(query: string): FileDisplayRecord[] {
        let isRegExp = this.isRegExp;
        if (query.startsWith("\\/")) {
            isRegExp = true;
            query = query.slice(2);
        }
        return this.loadFiles().filter((fileDisplayRecord: FileDisplayRecord) => {
            const title = fileDisplayRecord.displayTitle.toLowerCase();
            const path = fileDisplayRecord.path.toLowerCase();
            if (this.isRegExp) {
                // const regexQuery = queryTokens.map(token => {
                //     if (this.wrapInWildcards) {
                //         return `.*${token}.*`;
                //     }
                //     return token;
                // }).join('|');
                let regExp: RegExp;
                if (this.isWrapInWildcards) {
                    regExp = new RegExp(`.*${query}.*`, 'i');
                } else {
                    regExp = new RegExp(query, 'i');
                }
                return regExp.test(title) || regExp.test(path);
            } else {
                const queryTokens = query.toLowerCase().split(/\s+/);
                return queryTokens.every(token => title.includes(token) || path.includes(token));
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
                        true,
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

