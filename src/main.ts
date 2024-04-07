import {
    App,
    Component,
    Editor,
    MarkdownView,
    Modal,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting,
    TFile,
    TAbstractFile,
    WorkspaceLeaf,
    debounce,
    setIcon,
} from 'obsidian';

import {
    DataService,
} from "./dataservice";

import {
    BearingsConfiguration,
    BearingsSettingsData,
    BearingsSettingsTab,
    TRAJECTORIES_DEFAULT_SETTINGS as DEFAULT_SETTINGS,
} from "./settings";

import {
    buildLinkCopyMenu,
} from "./menus"

import {
    VIEW_TYPE as NAVIGATOR_VIEW_TYPE,
    BearingsView,
} from "./view";

export default class BearingsPlugin extends Plugin {
    configuration: BearingsConfiguration;
    dataService: DataService;

    async onload() {
        await this.loadSettings();
        this.dataService = new DataService();
        this.registerView(
            NAVIGATOR_VIEW_TYPE,
            (leaf) => new BearingsView(
                leaf,
                this,
                this.configuration,
                this.dataService,
            )
        );
        this.addRibbonIcon("radar", "Open the navigator", () => {
            this.activateView();
        });
        this.addCommand({
            id: 'open-bearings-navigator',
            name: 'View Bearings',
            callback: () => {
                this.activateView();
            }
        });
        this.registerEvent(
            this.app.workspace.on("file-menu", (menu, file) => {
                buildLinkCopyMenu(menu, file.path)
            })
        );
        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu, editor, view) => {
                if (menu && view?.file?.path) {
                    buildLinkCopyMenu(menu, view.file.path)
                }
            })
        );
		this.addSettingTab(new BearingsSettingsTab(
            this.app,
            this,
            this.configuration,
            () => this.saveSettings(),
		));
    }

    onunload() {
        // clear existing leaves
        // disabled for development
        // this.app.workspace.detachLeavesOfType(VIEW_TYPE_APEXNAVIGATOR)
    }

    async loadSettings() {
        // this.settings = DEFAULT_SETTINGS;
        // return;
        this.configuration = new BearingsConfiguration(Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        ));
    }

    async saveSettings() {
        await this.saveData(this.configuration);
    }

    async activateView() {
        // const { workspace } = this.app;
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(NAVIGATOR_VIEW_TYPE);

        if (leaves.length > 0) {
            // A leaf with our view already exists, use that
            leaf = leaves[0];
        } else {
            // if (this.settings.navigatorLocation == "left") {
            //     // in the right sidebar for it
            //     leaf = workspace.getLeftLeaf(false);
            // } else {
            //     leaf = workspace.getRightLeaf(false);
            // }
            leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({
                    type: NAVIGATOR_VIEW_TYPE,
                    active: true
                });
            }
        }

        // "Reveal" the leaf in case it is in a collapsed sidebar
        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

}

