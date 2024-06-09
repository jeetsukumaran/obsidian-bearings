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

    constructor(
        app: App,
        configuration: BearingsConfiguration,
    ) {
        super(app);
        this.configuration = configuration;
    }

    getSuggestions(query: string): FileDisplayRecord[] {
        return this.loadFiles()
                .filter(
                (fileDisplayRecord: FileDisplayRecord) =>
            fileDisplayRecord.displayTitle.toLowerCase().includes(query.toLowerCase())
            || fileDisplayRecord.path.toLowerCase().includes(query.toLowerCase())
        );
    }

    // Renders each suggestion item.
    renderSuggestion(fileDisplayRecord: FileDisplayRecord, el: HTMLElement) {
        el.createEl("div", { text: fileDisplayRecord.displayTitle });
        el.createEl("small", { text: fileDisplayRecord.path });
    }

    // Perform action on the selected suggestion.
    onChooseSuggestion(fileDisplayRecord: FileDisplayRecord, evt: MouseEvent | KeyboardEvent) {
        new Notice(`Selected ${fileDisplayRecord.path}`);
    }

    loadFiles(): FileDisplayRecord[] {
        return this.app.vault
            .getMarkdownFiles()
            .map( (file: TFile) => {
                return {
                    path: file.path,
                    displayTitle: getDisplayTitle(
                        this.app,
                        this.configuration,
                        undefined,
                        file,
                        file.path,
                    ),
                }
            })
            .sort((a: FileDisplayRecord, b: FileDisplayRecord) => a.displayTitle.localeCompare(b.displayTitle));
    }
}
