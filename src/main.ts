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
    BEARINGS_DEFAULT_SETTINGS as DEFAULT_SETTINGS,
} from "./settings";

import {
    buildLinkCopyMenu,
    buildLinkTargetEditMenu,
} from "./menus"

import {
    UpdateDisplayTitleModal,
    appendFrontmatterLists,
    // CreateRelationshipModal,
} from "./dataupdate"

import {
    CreateRelationshipModal,
} from "./CreateRelationship"

import {
    VIEW_TYPE as NAVIGATOR_VIEW_TYPE,
    BearingsView,
    NavigationContext,
    NavigationView,
} from "./view";

export default class BearingsPlugin extends Plugin {
    configuration: BearingsConfiguration;
    dataService: DataService;
    activeNavigators: NavigationView[] = [];

    async onload() {

        /* Setup */
        await this.loadSettings();
        this.dataService = new DataService(this.app, this.configuration);
        this.refresh = this.refresh.bind(this);
        this.codeBlockRefresh = this.codeBlockRefresh.bind(this);

        /* Code block */
        this.registerMarkdownCodeBlockProcessor(
            "bearings",
            (source, el, ctx) => {
                // console.log(source);
                // console.log(el);
                // console.log(ctx);

                // source = source.trim();
                // let trimmedSource = source.trim()
                // if (!trimmedSource || trimmedSource === ":self:") {
                //     source = inventorizeSelfSpec;
                // } else if (trimmedSource === ":children:") {
                //     source = inventorizeChildrenSpec;
                // }
                // this.dataService.refresh()

                let sourcePath = ctx.sourcePath;
                let root = el;
                let navigationContext = new NavigationContext(
                    this.app,
                    this.configuration,
                    this.dataService,
                    "",
                    async () => {
                        // await this.dataService.refresh();
                        // await this.render();
                        // let focalFilePath = this.computeActiveFilePath();
                        // this.navigationView.refresh({"isForce": true, isCodeBlock: false});
                        this.refresh();
                    },
                    true,
                );

                let navigationView = new NavigationView(
                    navigationContext,
                    root,
                );

                // let hoverSourceId = NAVIGATOR_VIEW_TYPE;
                // this.registerHoverLinkSource(
                //     hoverSourceId,
                //     {
                //         defaultMod: false, /* require ctrl key trigger */
                //         display: NAVIGATOR_VIEW_TYPE,
                //     }
                // );

                navigationView.render(
                    sourcePath, {
                    isCodeBlock: true,
                    isForce: true,
                });
                this.activeNavigators.push(navigationView)
            });
        this.addCommand({
            id: 'refresh-bearings-code-blocks',
            name: 'Navigation code blocks: refresh',
            // callback: this.codeBlockRefresh,
            callback: this.refresh,
        });

        this.addCommand({
            id: 'create-bearings-relationship',
            name: 'Create relationship ...',
            callback: () => this.addRelationship(),
        });


        /* Sidebar view */
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

        this.addRibbonIcon("git-branch-plus", "Create relationship", () => {
            this.addRelationship();
        });

        this.addCommand({
            id: 'open-bearings-navigator',
            name: 'Sidebar navigator: open',
            callback: () => {
                this.activateView();
            }
        });

        this.addCommand({
            id: 'toggle-bearings-navigator',
            name: 'Sidebar navigator: toggle',
            callback: () => {
                if (this.app.workspace.rightSplit.collapsed) {
                    // this.app.workspace.rightSplit.expand();
                    this.activateView();
                } else {
                    this.app.workspace.rightSplit.collapse();
                }
            }
        });


        /* File menu */

        this.registerEvent(
            this.app.workspace.on("file-menu", (menu, file) => {
                buildLinkTargetEditMenu(
                    this.app,
                    this.configuration,
                    menu,
                    file.path,
                    async () => {},
                    true,
                );
                buildLinkCopyMenu(menu, this.app, file.path)

            })
        );

        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu, editor, view) => {
                if (menu && view?.file?.path) {
                    buildLinkCopyMenu(menu, this.app, view.file.path)
                }
            })
        );

        /* Settings */
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

    addRelationship() {
        let activeFilePath: string = this.app.workspace.getActiveFile()?.path || "";
        const modal = new CreateRelationshipModal(
            this.app,
            this.configuration,
            activeFilePath,
            "",
            this.refresh,
        );
        modal.open();
    }

    async loadSettings() {
        let rawSettings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        )
        // update to new config
        // let isMigrated: boolean = false;
        // if (rawSettings.relationshipDefinitions) {
        //     Object.keys(rawSettings.relationshipDefinitions).forEach( (key: string) => {
        //         let value = rawSettings.relationshipDefinitions[key];
        //         if (value.designatedPropertyName && !value.primaryRelationshipRole) {
        //             value.primaryRelationshipRole = value.designatedPropertyName;
        //             isMigrated = true;
        //         }
        //     });
        //     if (isMigrated) {
        //         await this.saveSettings()
        //     }
        // }
        this.configuration = new BearingsConfiguration(rawSettings);
    }

    async saveSettings() {
        await this.saveData(this.configuration);
    }

    async refresh() {
        await this.codeBlockRefresh();
    }

    async codeBlockRefresh() {
        await this.activeNavigators.forEach( (nav: NavigationView) => nav.refresh({
            isCodeBlock: true,
            isForce: true,
        }))
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

