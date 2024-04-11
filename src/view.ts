
import {
    ItemView,
    App,
    Component,
    Editor,
    TFile,
    MarkdownView,
    MarkdownRenderer,
    MarkdownRenderChild,
    Menu,
    Modal,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting,
    ButtonComponent,
    ToggleComponent,
    WorkspaceLeaf,
    setIcon,
    CachedMetadata,
    normalizePath,
} from "obsidian";

import * as _path from "path";


import {
    DataService,
    RelationshipLinkedPathDataType,
    FileNavigationTreeNode,
    FileNode,
    FilePathType,
    FilePathNodeMapType,
} from "./dataservice";

import {
    BearingsConfiguration,
} from "./settings";

import {
    buildLinkCopyMenu,
    buildLinkOpenMenu,
} from "./menus"

import {
    InputNumberComponent,
} from "./InputNumber"

export const VIEW_TYPE = "bearings-navigator-view";
export const DISPLAY_TEXT = "Bearings";



const OUTLINKED_RELATIONSHIP_GLYPH = "↤";
const INLINKED_RELATIONSHIP_GLYPH = "↦";
const BILINKED_RELATIONSHIP_GLYPH = "⇌";

// const OUTLINKED_RELATIONSHIP_GLYPH = "⇽";
// const INLINKED_RELATIONSHIP_GLYPH = "⇾";
// const BILINKED_RELATIONSHIP_GLYPH = "⇿";

// const OUTLINKED_RELATIONSHIP_GLYPH = "←";
// const INLINKED_RELATIONSHIP_GLYPH = "→";
// const BILINKED_RELATIONSHIP_GLYPH = "↔";

// const OUTLINKED_RELATIONSHIP_GLYPH = "🠴";
// const INLINKED_RELATIONSHIP_GLYPH = "🠶";
// const BILINKED_RELATIONSHIP_GLYPH = "⇌";

// const OUTLINKED_RELATIONSHIP_GLYPH = "🠴";
// const INLINKED_RELATIONSHIP_GLYPH = "🠶";
// const BILINKED_RELATIONSHIP_GLYPH = "↔";

// const OUTLINKED_RELATIONSHIP_GLYPH = "↼";
// const INLINKED_RELATIONSHIP_GLYPH = "⇀";
// const BILINKED_RELATIONSHIP_GLYPH = "⇌";

type NavigationViewResults = {
    treeNodes: FileNavigationTreeNode[],
    parentFileNode?: FileNode,
};

export class BearingsView extends ItemView {
    plugin: Plugin;
    configuration: BearingsConfiguration;
    dataService: DataService;
    navigationView: NavigationView;
    root: HTMLElement;
    icon = "radar";

    constructor(
        leaf: WorkspaceLeaf,
        plugin: Plugin,
        configuration: BearingsConfiguration,
        dataService: DataService,
    ) {
        super(leaf);
        this.plugin = plugin;
        this.configuration = configuration;
        this.dataService = dataService;
        this.plugin.registerHoverLinkSource(
            VIEW_TYPE,
            {
                defaultMod: true, /* require ctrl key trigger */
                display: DISPLAY_TEXT,
            }
        );
        this.onActiveLeafChange = this.onActiveLeafChange.bind(this);
    }

    computeActiveFilePath(): string {
        return this.plugin.app.workspace.getActiveFile()?.path || "";
    }

    getViewType() {
        return VIEW_TYPE;
    }

    getDisplayText() {
        return DISPLAY_TEXT;
    }

    async refresh() {
        await this.dataService.refresh();
    }

    async onActiveLeafChange() {
        this.render();
    }

    async onOpen() {
        this.app.workspace.on('active-leaf-change', this.onActiveLeafChange);
        this.render();
    }

    async render() {
        await this.refresh();
        // if (this.root) {
        //     this.root.empty();
        // } else {
        if (!this.root || !this.navigationView) {
            if (this.root) {
                this.root.empty();
            }
            this.root = this.containerEl.children[1].createEl("div",);
            let navigationContext = new NavigationContext(
                this.plugin.app,
                this.configuration,
                this.dataService,
                "",
                // true,
            );
            this.navigationView = new NavigationView(
                navigationContext,
                this.root,
            );
        }
        this.navigationView.render(this.computeActiveFilePath());
    }

    async onClose() {
        this.app.workspace.off('active-leaf-change', this.onActiveLeafChange);
    }
}

export class NavigationContext {

    app: App;
    configuration: BearingsConfiguration;
    dataService: DataService;
    _focalFilePath: string;
    // isOpenFocalFile: boolean = false;

    constructor(
        app: App,
        configuration: BearingsConfiguration,
        dataService: DataService,
        focalFilePath: string,
        // isOpenFocalFile: boolean,
    ) {
        this.app = app;
        this.configuration = configuration;
        this.dataService = dataService;
        this._focalFilePath = focalFilePath;
        // this.isOpenFocalFile = isOpenFocalFile;
    }

}

export class NavigationBase extends Component implements MarkdownRenderChild {

    _context: NavigationContext;
    root: HTMLElement;

    constructor(
        navigationContext: NavigationContext,
        root: HTMLElement,
    ) {
        super();
        this._context = navigationContext;
        this.root = root;
    }

    isFocalFile(currentPath: FilePathType): boolean {
        return (currentPath != "" && (this._context._focalFilePath === currentPath));
    }

    get focalFilePath(): string {
        return this._context._focalFilePath;
    }

    get containerEl() {
        return this.root;
    }

    renderMarkdown(
        text: string,
        element: HTMLElement,
        sourcePath: string = "",
    ) {
        MarkdownRenderer.renderMarkdown(
            text,
            element,
            sourcePath,
            this,
        )
    }

}

export class NavigationView extends NavigationBase {

    viewContainer: HTMLElement;
    isPinned: boolean = false;
    isClosed: boolean = true;
    isBypassFileChangeCheck: boolean = false;
    toggleOptionState: { [key: string]: boolean } = {};

    async refresh(
        options: { [key: string]: boolean } = {},
    ) {
        await this.render(this._context._focalFilePath, {
            ... options,
            isForced: true,
        });
        // this.render(this.app.workspace.getActiveFile()?.path || "", true);
    }

    get isFixed(): boolean {
        return false;
    }

    createToggleButton(
        key: string,
        controlRow: HTMLElement,
        trueIcon: string,
        falseIcon: string,
        trueToolTip: string,
        falseToolTip: string,
        callbackAction: (value: boolean) => void,
        initialValue: boolean,
    ) {
        let controlCell = controlRow.createEl("div", {cls: ["bearings-control-cell"]});
        let button = new ButtonComponent(
            controlRow.createEl("div", {cls: [ "bearings-control-cell", ]})
        );
        button.setClass("bearings-control-button");
        this.toggleOptionState[key] = initialValue;
        const setToggle = () => {
            if (this.toggleOptionState[key]) {
                button.setIcon(trueIcon);
                button.setTooltip(trueToolTip);
                // button.classList.add("bearings-toggle-is-true");
                // button.removeClass("bearings-toggle-is-false");
            } else {
                button.setIcon(falseIcon);
                button.setTooltip(falseToolTip);
                // button.removeClass("bearings-toggle-is-true");
                // button.addClass("bearings-toggle-is-false");
            }
        };
        setToggle();
        button.onClick( () => {
            this.toggleOptionState[key] = !this.toggleOptionState[key];
            setToggle();
            callbackAction(this.toggleOptionState[key]);
        });
    }

    async render(
        targetFilePath: string,
        options: { [key: string]: boolean } = {},
    ) {
        if (!options.isForced) {
            if (this.isPinned) {
                return true;
            }
            if (!this.isBypassFileChangeCheck) {
                if (this._context._focalFilePath && this._context._focalFilePath === targetFilePath) {
                    return true;
                };
            }
        }
        this.root.empty();
        this._context._focalFilePath = targetFilePath;
        if (!this._context._focalFilePath) {
            return;
        }
        this.viewContainer = this.root.createEl("div", {
            cls: [
                "bearings-main-container",
                options.isCodeBlock ? "bearings-container-codeblock" : "bearings-container-sidebar",
            ]
        });
        this.viewContainer.classList.add("bearings-main-container-open");

        let viewHeaderContainer = this.viewContainer.createEl("div", {
            cls: ["bearings-main-container-header"]
        });
        let headerLeft = viewHeaderContainer.createEl("div", {
            cls: ["bearings-main-container-header-left"],
        });

        // Controls
        // let controlRow = headerLeft.createEl("div", {cls: [options.isCodeBlock ? "bearings-control-row" : "bearings-control-column"]});
        let controlRow = headerLeft.createEl("div", {cls: ["bearings-control-row"]});
        if (!options.isCodeBlock) {
            this.createToggleButton(
                "isPinned",
                controlRow,
                "pin-off",
                "pin",
                "Unpin the focal note",
                "Pin the focal note",
                (value: boolean) => {
                    this.isPinned = value;
                },
                false,
            );
        } else {
            this.createToggleButton(
                "isOpen",
                controlRow,
                "chevron-down",
                "chevron-right",
                "Close the view",
                "Open the view",
                (value: boolean) => {
                    if (value) {
                        this.viewContainer.classList.remove("bearings-main-container-closed");
                        this.viewContainer.classList.add("bearings-main-container-open");
                    } else {
                        this.viewContainer.classList.add("bearings-main-container-closed");
                        this.viewContainer.classList.remove("bearings-main-container-open");
                    }
                },
                true,
            );
        }

        // Refresh button
        let refreshButton = new ButtonComponent(
            controlRow.createEl("div", {cls: [ "bearings-control-cell", ]})
        );
        refreshButton.setClass("bearings-control-button");
        refreshButton.setIcon("rotate-ccw");
        refreshButton.setTooltip("Refresh the view");
        const refreshAction = () => {
            this.refresh(options);
        };
        refreshButton.onClick( () => refreshAction() );

        let headerRight = viewHeaderContainer.createEl("div", {
            cls: ["bearings-main-container-header-right"],
        });
        let headerLabel = headerRight.createEl("div", {
            cls: ["bearings-main-container-header-label"],
            text: this._context.dataService.getFileNode(this._context._focalFilePath).indexEntryText,
        });


        // // Refresh button
        // let controlRowRight = headerRight.createEl("div", {cls: ["bearings-control-row"]});
        // let refreshButton = new ButtonComponent(
        //     controlRowRight.createEl("div", {cls: [ "bearings-control-cell", ]})
        // );
        // refreshButton.setClass("bearings-control-button");
        // refreshButton.setIcon("rotate-ccw");
        // refreshButton.setTooltip("Refresh the view");
        // const refreshAction = () => {
        //     this.refresh(options);
        // };
        // refreshButton.onClick( () => refreshAction() );


        let viewContainerBody = this.viewContainer.createEl("div", {cls: "bearings-main-container-body"})
        let ascenderViewFrame = new SuperordinateRelationshipsAscendersViewFrame(
            this._context,
            viewContainerBody.createEl("div", {cls: "bearings-viewframe-container"}),
            "Positions",
        );
        ascenderViewFrame.render();

        // this.viewContainer.createEl("div", {cls: "bearings-viewframe-section-title", text: "Parallels"});
        let parallelsViewFrame = new ParallelRelationshipsViewFrame(
            this._context,
            viewContainerBody.createEl("div", {cls: "bearings-viewframe-container"}),
            "Parallels"
        );
        parallelsViewFrame.render();

        let coordinateViewFrame = new CoordinateRelationshipsViewFrame(
            this._context,
            viewContainerBody.createEl("div", {cls: "bearings-viewframe-container"}),
            "Referrals",
        );
        coordinateViewFrame.render();

        let backlinkedViewFrame = new BacklinkedRelationshipsViewFrame(
            this._context,
            viewContainerBody.createEl("div", {cls: "bearings-viewframe-container"}),
            "Backlinks",
        );
        backlinkedViewFrame.render();

    }
}

abstract class NavigationViewFrame extends NavigationBase {
    root: HTMLElement;
    viewFrame: HTMLElement;
    viewPort: HTMLElement;
    title: string;
    _discoveryDepthLimit: number | null;
    _autoexpansionDepthLimit: number | null;
    isDefaultOpen: boolean = false;
    isForceOpen: boolean | null = null;

    abstract generateResults(): NavigationViewResults;

    constructor(
        navigationContext: NavigationContext,
        root: HTMLElement,
        title: string,
    ) {
        super(
            navigationContext,
            root,
        );
        this.title = title;
    }

    _validateDepthLimitSetting(ival: string): number | null {
        if (ival === "") {
            return null;
        }
        let rval = Number(ival);
        if (isNaN(rval)) {
            return 0;
        } else {
            return rval;
        }
    }

    get discoveryDepthLimit(): number | null {
        if (this._discoveryDepthLimit === undefined) {
            this._discoveryDepthLimit = this.getDefaultDiscoveryDepthLimit();
        }
        return this._discoveryDepthLimit;
    }

    get autoexpansionDepthLimit(): number | null {
        if (this._autoexpansionDepthLimit === undefined) {
            this._autoexpansionDepthLimit = this.getDefaultDiscoveryDepthLimit();
        }
        return this._autoexpansionDepthLimit;
    }


    getDefaultDiscoveryDepthLimit(): number | null {
        return 2;
    }

    getDefaultAutoexpansionDepthLimit(): number | null {
        return 2;
    }


    setLocalOptions(
        entryFrame: NavigationEntryFrame,
        entryData: FileNavigationTreeNode,
    ) {
    }

    async renderControlBar() {
        let headerSection = this.viewFrame.createEl("div", {
            cls: "bearings-viewframe-section-header"
        });
        headerSection.createEl("div", {
            cls: "bearings-viewframe-section-title",
            text: this.title,
        });
        let mainControlsContainer = headerSection.createEl("div", {
            cls: ["bearings-control-row"]
        });
        let getControlCell = () => mainControlsContainer.createEl("div", {
            cls: ["bearings-control-cell"]
        });

        const nodeCollapseAllAction = () => {
            this.isForceOpen = false;
            this.root.empty();
            this.render();
            this.isForceOpen = null;
        };
        const nodeExpandAllAction = () => {
            this.isForceOpen = true;
            this.root.empty();
            this.render();
            this.isForceOpen = null;
        };
        let discoveryDepthLimitInput = new InputNumberComponent(
            getControlCell(),
            -1,
            10,
            this.discoveryDepthLimit === null ? -1 : this.discoveryDepthLimit,
            (value: number | null) => {
                if (value === null || value < 0) {
                    this._discoveryDepthLimit = null;
                } else {
                    this._discoveryDepthLimit = value;
                }
                // this.render();
                nodeExpandAllAction();
            },
            "Depth",
        );

        // let autoexpansionDepthLimitInput = new InputNumberComponent(
        //     getControlCell(),
        //     -1,
        //     10,
        //     this.autoexpansionDepthLimit === null ? -1 : this.autoexpansionDepthLimit,
        //     (value: number | null) => {
        //         if (value === null || value < 0) {
        //             this._autoexpansionDepthLimit = null;
        //         } else {
        //             this._autoexpansionDepthLimit = value;
        //         }
        //         // this.render();
        //         nodeExpandAllAction();
        //     },
        //     "Depth",
        // );


        let nodeCollapseAllButton = new ButtonComponent(getControlCell());
        nodeCollapseAllButton.setClass("bearings-control-button");
        nodeCollapseAllButton.setIcon("chevrons-down-up");
        nodeCollapseAllButton.setTooltip("Collapse all nodes");
        nodeCollapseAllButton.onClick( () => nodeCollapseAllAction() );

        let nodeExpandAllButton = new ButtonComponent(getControlCell());
        nodeExpandAllButton.setClass("bearings-control-button");
        nodeExpandAllButton.setTooltip("Expand all nodes");
        nodeExpandAllButton.setIcon("chevrons-up-down");
        nodeExpandAllButton.onClick( () => nodeExpandAllAction() );

    }

    async render() {
        if (this.viewFrame) {
            this.root.empty();
        }
        this.viewFrame = this.root.createEl("div", {
            cls: ["bearings-viewframe"]
        });
        this.renderControlBar();
        this.viewPort = this.viewFrame.createEl("div", {
            cls: ["bearings-viewport"]
        });
        let results: NavigationViewResults = this.generateResults()
        results.treeNodes
            .sort( (a: FileNavigationTreeNode, b: FileNavigationTreeNode) => a.value.sort_key(b.value) )
            .forEach( (entryData: FileNavigationTreeNode) => {
                let viewEntry = new NavigationEntryFrame(
                    this._context,
                    this.viewPort,
                    this,
                    this.isFocalFile(entryData.value.filePath),
                );
                viewEntry.setupCallbackFn = (
                                             entryFrame: NavigationEntryFrame,
                                             entryData: FileNavigationTreeNode,
                                            ) => this.setLocalOptions(entryFrame, entryData);
                // this.setLocalOptions(viewEntry, entryData);
                viewEntry.render(
                    entryData,
                    results.parentFileNode || undefined,
                    this.autoexpansionDepthLimit,
                );
            });
    }

}

export class SuperordinateRelationshipsAscendersViewFrame extends NavigationViewFrame {

    isFocalFileExpandedOnce: boolean = false;
    private nFocalFileSeen: number = 0;

    constructor(
        navigationContext: NavigationContext,
        root: HTMLElement,
        title: string,
    ) {
        super(navigationContext, root, title);
        // Initialization moved to here for clarity, but it's already correctly placed
        this.nFocalFileSeen = 0; // Explicitly initialize to 0 to avoid NaN
    }

    getDefaultDiscoveryDepthLimit(): number | null {
        return this._validateDepthLimitSetting(this._context.configuration.options.discoveryDepthLimitPrimary);
    }

    setLocalOptions(
        entryFrame: NavigationEntryFrame,
        entryData: FileNavigationTreeNode,
    ) {
        let isDefaultOpenFocalFile = false;
        if (this.isFocalFile(entryData.value.filePath)) {
            this.nFocalFileSeen = this.nFocalFileSeen + 1;
            // entryFrame.isPostFocalFile
        }
        if (!this.isFocalFileExpandedOnce && this.isFocalFile(entryData.value.filePath)) {
            this.isFocalFileExpandedOnce = true;
            isDefaultOpenFocalFile = true;
        }
        if (!entryFrame.isPostFocalFile) {
            entryFrame.options.isIgnoreDefaultOpenLimit = true;
        } else {
            entryFrame.options.isIgnoreDefaultOpenLimit = false;
        }
        entryFrame.options.isHighlightFocalFile = true;
        entryFrame.options.isDefaultOpenFocalFile = isDefaultOpenFocalFile;
        entryFrame.options.isDefaultOpen = true;
    }

    generateResults(): NavigationViewResults {
        let treeNodes: FileNavigationTreeNode[] = [];
        treeNodes = this._context.dataService.superordinateChains(
            this.focalFilePath,
            this._context.configuration.superordinateRelationshipDefinitions(),
            true,
            this.discoveryDepthLimit,
        );
        return {
            treeNodes: treeNodes,
        };
    }

}

export class SubordinateRelationshipsViewFrame extends NavigationViewFrame {

    setLocalOptions(
        entryFrame: NavigationEntryFrame,
        entryData: FileNavigationTreeNode,
    ) {
        entryFrame.options.isHighlightFocalFile = true;
        entryFrame.options.isDefaultOpenFocalFile = true;
    }

    getDefaultDiscoveryDepthLimit(): number | null {
        return this._validateDepthLimitSetting(this._context.configuration.options.discoveryDepthLimitSecondary);
    }

    generateResults():
    NavigationViewResults {
        let subtreeRoot = this._context.dataService.subordinateSubtrees(
                this.focalFilePath,
                this._context.configuration.superordinateRelationshipDefinitions(),
                this.discoveryDepthLimit
        );
        // return {
        //     treeNodes: [... subtreeRoot.children],
        //     parentFileNode: subtreeRoot.value,
        // };
        return {
            treeNodes: [subtreeRoot],
        };
    }

}

export class CoordinateRelationshipsViewFrame extends NavigationViewFrame {

    getDefaultDiscoveryDepthLimit(): number | null {
        return this._validateDepthLimitSetting(this._context.configuration.options.discoveryDepthLimitSecondary);
    }

    setLocalOptions(
        entryFrame: NavigationEntryFrame,
        entryData: FileNavigationTreeNode,
    ) {
        entryFrame.options.isHighlightFocalFile = true;
        entryFrame.options.isOpenFocalFile = false;
    }

    generateResults():
    NavigationViewResults {
        let subtreeRoot = this._context.dataService.coordinateSubtrees(
            this.focalFilePath,
            this._context.configuration.coordinateRelationshipDefinitions(),
            this.discoveryDepthLimit,
        )

        // return {
        //     treeNodes: [... subtreeRoot.children],
        //     parentFileNode: subtreeRoot.value,
        // };
        return {
            treeNodes: [subtreeRoot],
        };
    }
}

export class ParallelRelationshipsViewFrame extends NavigationViewFrame {

    getDefaultDiscoveryDepthLimit(): number | null {
        return this._validateDepthLimitSetting(this._context.configuration.options.discoveryDepthLimitSecondary);
    }

    setLocalOptions(
        entryFrame: NavigationEntryFrame,
        entryData: FileNavigationTreeNode,
    ) {
        entryFrame.options.isHighlightFocalFile = true;
        entryFrame.options.isOpenFocalFile = false;
    }

    generateResults():
    NavigationViewResults {
        let treeNodes: FileNavigationTreeNode[] = [];
        let currentFileNode = this._context.dataService.getFileNode(this.focalFilePath);
        let fileNodePathMap = new Map<FilePathType, FileNode>();
        let currentFileSuperordinates = currentFileNode.superordinateChains(
            "standard",
            this._context.configuration.superordinateRelationshipDefinitions(),
            1,
            fileNodePathMap,
        ).rootNodes;
        currentFileSuperordinates.forEach( (superordinate: FileNavigationTreeNode) => {
            treeNodes.push(
                this._context.dataService.subordinateSubtrees(
                    superordinate.value.filePath,
                    this._context.configuration.superordinateRelationshipDefinitions(),
                    this.discoveryDepthLimit,
                    // fileNodePathMap,
                ),
            );
        });
        return {
            treeNodes: treeNodes,
        };
    }

}

export class BacklinkedRelationshipsViewFrame extends NavigationViewFrame {
    // "My parent's children"

    getDefaultDiscoveryDepthLimit(): number | null {
        return this._validateDepthLimitSetting(this._context.configuration.options.discoveryDepthLimitSecondary);
    }

    generateResults():
    NavigationViewResults {
        let currentFileNode = this._context.dataService.getFileNode(this.focalFilePath);
        let backlinkedNodes: FileNavigationTreeNode[] = currentFileNode
            .backlinkedFileNodes()
            .map( (fileNode: FileNode) => {
                return this._context.dataService.subordinateSubtrees(
                   fileNode.filePath,
                   this._context.configuration.superordinateRelationshipDefinitions(),
                   0,
                )
            });
        return {
            treeNodes: backlinkedNodes,
        };
    }

}

export class NavigationEntryFrame extends NavigationBase {

    private isOpen: boolean;
    indicatorSize: number = 16;
    elements: { [key: string]: HTMLElement } = {};
    options: { [key: string]: boolean } = {};
    setupCallbackFn: (entryFrame: NavigationEntryFrame, entryData: FileNavigationTreeNode) => void;
    parentViewFrame: NavigationViewFrame;
    isPostFocalFile: boolean;

    constructor(
        navigationContext: NavigationContext,
        root: HTMLElement,
        parentViewFrame: NavigationViewFrame,
        isPostFocalFile: boolean,
    ) {
        super(
            navigationContext,
            root,
        );
        this.parentViewFrame = parentViewFrame;
        this.isPostFocalFile = isPostFocalFile;
    }

    // composeOpenIndicatorInnerHTML(): string {
    //     return "🠷";

    //     // return `
    //     //     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-chevron-down"><circle cx="12" cy="12" r="10"/><path d="m16 10-4 4-4-4"/></svg>
    //     // `;
    //     return `
    //         <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-arrow-out-down-right"><path d="M12 22a10 10 0 1 1 10-10"/><path d="M22 22 12 12"/><path d="M22 16v6h-6"/></svg>
    //     `;
    //     // return "⇱";

    //     // return `
    //     //     <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-arrow-out-down-right"><path d="M12 22a10 10 0 1 1 10-10"/><path d="M22 22 12 12"/><path d="M22 16v6h-6"/></svg>
    //     // `

    //     // return "🠷";

    //     // return `
    //     //     <svg xmlns="http://www.w3.org/2000/svg" width="${this.indicatorSize}" height="${this.indicatorSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"> <path d="m6 9 6 6 6-6"/></svg>
    //     // `;
    // }

    // composeClosedIndicatorInnerHTML(): string {
    //     return "🠶";
    //     // return `
    //     //     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-chevron-right"><circle cx="12" cy="12" r="10"/><path d="m10 8 4 4-4 4"/></svg>
    //     // `;
    //     // return "⇲";
    //     // return `
    //     //     <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-arrow-out-up-right"><path d="M22 12A10 10 0 1 1 12 2"/><path d="M22 2 12 12"/><path d="M16 2h6v6"/></svg>
    //     // `;
    //     return `
    //         <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-arrow-out-up-right"><path d="M22 12A10 10 0 1 1 12 2"/><path d="M22 2 12 12"/><path d="M16 2h6v6"/></svg>
    //     `;
    //     // return `
    //     // <svg xmlns="http://www.w3.org/2000/svg" width="${this.indicatorSize}" height="${this.indicatorSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
    //     // `;

    // }

    get isHighlightFocalFile(): boolean {
        return this.options.isHighlightFocalFile ?? true;
    }

    get isDefaultOpenFocalFile(): boolean {
        return this.options.isDefaultOpenFocalFile ?? true;
    }

    get isDefaultOpen(): boolean {
        return this.options.isDefaultOpen ?? this.parentViewFrame.isDefaultOpen;
    }

    async render(
        entryData: FileNavigationTreeNode,
        parentFileNode: FileNode | null = null,
        defaultOpenDepthLimit: number | null,
    ) {
        if (this.setupCallbackFn !== undefined) {
            this.setupCallbackFn(
                this,
                entryData,
            );
        }
        let subtreeDefaultOpenDepthLimit: number | null = defaultOpenDepthLimit === null ? null : defaultOpenDepthLimit - 1;
        if (this.parentViewFrame.isForceOpen === true) {
            this.isOpen = true;
            // subtreeDefaultOpenDepthLimit: defaultOpenDepthLimit;
        } else if (this.parentViewFrame.isForceOpen === false) {
            this.isOpen = false;
        } else {
            if (this.isFocalFile(entryData.value.filePath)) {
                this.isOpen = this.isDefaultOpenFocalFile;
            } else if (!this.options.isIgnoreDefaultOpenLimit) {
                this.isOpen = defaultOpenDepthLimit === null ? true : defaultOpenDepthLimit > 1;
            } else {
                this.isOpen = this.isDefaultOpen;
            }
        }
        console.log("---");
        console.log(this);
        console.log(entryData);
        console.log(defaultOpenDepthLimit);
        console.log(subtreeDefaultOpenDepthLimit);
        console.log(this.isOpen);
        // let isNodeOpen: boolean =  (this._context.isOpenFocalFile || !this.isFocalFile(entryData.value.filePath));
        // this.isOpen = !this.isFocalFile(entryData.value.filePath);
        // this.isOpen = !this.isFocalFile(entryData.value.filePath);
        // if (this.isOpen)  = this.isOpen ?? true;

        this.elements.entryFrame = this.root.createEl("div", {
            cls: ["bearings-entry-frame"]
        });

        this.elements.entryGutterLeft = this.elements.entryFrame.createEl("div", {
            cls: ["bearings-entry-gutter"]
        });

        this.elements.entryGutterLeftHead = this.elements.entryGutterLeft.createEl("div", {
            cls: ["bearings-entry-gutter-head"]
        });

        let relationships: RelationshipLinkedPathDataType[] = [];
        if (parentFileNode && parentFileNode.relationships[entryData.value.filePath]) {
            relationships.push( ... parentFileNode.relationships[entryData.value.filePath]);
        } else if (parentFileNode) {
            relationships.push( ... entryData?.value?.relationships[parentFileNode.filePath]);
        }
        if (relationships.length > 0) {
            const invertedRelationships: RelationshipLinkedPathDataType[] = relationships.filter( (relationship: RelationshipLinkedPathDataType) => relationship.isInlink );
            let relationshipPolarityGlyph: string = "";
            if (invertedRelationships.length === 0) {
                relationshipPolarityGlyph = OUTLINKED_RELATIONSHIP_GLYPH;
            } else if (invertedRelationships.length === relationships.length) {
                relationshipPolarityGlyph = INLINKED_RELATIONSHIP_GLYPH;
            } else {
                relationshipPolarityGlyph = BILINKED_RELATIONSHIP_GLYPH;
            }
            if (relationshipPolarityGlyph) {
                this.elements.relationshipsContainer = this.elements.entryGutterLeftHead.createEl("div", {
                    cls: ["bearings-entry-node-connection-container"],
                });
                let relEl = this.elements.relationshipsContainer.createEl("div", {
                    cls: ["bearings-entry-node-connection-cell"],
                });
                relEl.innerText = relationshipPolarityGlyph;
            }
        }

        this.elements.entryNodeToggleContainer = this.elements.entryGutterLeftHead.createEl("div", {
            cls: ["bearings-entry-node-toggle-container"]
        });
        let setIndicator = () => {
            if (entryData.children.length > 0) {
                this.elements.entryNodeToggleContainer.classList.remove("bearings-node-leaf");
                if (this.isOpen) {

                    // this.elements.entryNodeToggleContainer.innerHTML = this.composeOpenIndicatorInnerHTML();
                    this.elements.entryNodeToggleContainer.setText("🠷");

                    Object.values(this.elements).forEach( (el: HTMLElement) => {
                        el.classList.remove("bearings-node-closed");
                        el.classList.add("bearings-node-opened");
                    });

                } else {

                    this.elements.entryNodeToggleContainer.setText("🠶");

                    Object.values(this.elements).forEach( (el: HTMLElement) => {
                        el.classList.add("bearings-node-closed");
                        el.classList.remove("bearings-node-opened");
                    });
                }
            } else {
                this.elements.entryNodeToggleContainer.classList.add("bearings-node-leaf");
                // let terminal: string = "🠴";
                // let terminal: string = "🞊";
                // let terminal: string = "🞚";
                // let terminal: string = "🌢";
                // let terminal: string = "☉";
                // let terminal: string = "⪦";
                // let terminal: string = "⪧";
                let terminal: string = "⏺";
                // let terminal: string = "⨀";
                // let terminal: string = "⨁";
                // let terminal: string = "⟦";
                // let terminal: string = "⟴";
                // let terminal: string = "¶";
                // let terminal: string = "§";
                // let terminal: string = "⋇";
                // let terminal: string = "⊛";
                // let terminal: string = "⦿";
                // let terminal: string = "🟘";
                // let terminal: string = "⬡";
                this.elements.entryNodeToggleContainer.setText(terminal);
            }
        };
        this.elements.entryNodeToggleContainer.addEventListener('click', () => {
            this.isOpen = !this.isOpen;
            setIndicator()
        });

        this.elements.entryGutterLeftTail = this.elements.entryGutterLeft.createEl("div", {
            cls: ["bearings-entry-gutter-tail"]
        });
        // this.elements.entryGuideline = this.elements.entryGutterLeftTail.createEl("div", {
        this.elements.entryGuideline = this.elements.entryGutterLeft.createEl("div", {
            cls: ["bearings-entry-guideline"]
        });
        this.elements.entryGuideline.innerText = " ";

        this.elements.entryMain = this.elements.entryFrame.createEl("div", {
            cls: ["bearings-entry-main"]
        });
        this.elements.entryHead = this.elements.entryMain.createEl("div", {
            cls: ["bearings-entry-head"]
        });

        // if (parentEntryData && parentEntryData.value.relationships[entryData.value.filePath]) {
        //     const relationships = parentEntryData.value.relationships[entryData.value.filePath];
        //     const invertedRelationships: RelationshipLinkedPathDataType[] = relationships.filter( (relationship: RelationshipLinkedPathDataType) => relationship.isInlink );
        //     let relationshipPolarityGlyph: string = "";
        //     if (invertedRelationships.length === 0) {
        //         relationshipPolarityGlyph = OUTLINKED_RELATIONSHIP_GLYPH;
        //     } else if (invertedRelationships.length === relationships.length) {
        //         relationshipPolarityGlyph = INLINKED_RELATIONSHIP_GLYPH;
        //     } else {
        //         relationshipPolarityGlyph = BILINKED_RELATIONSHIP_GLYPH;
        //     }
        //     if (relationshipPolarityGlyph) {
        //         this.elements.relationshipsContainer = this.elements.entryHead.createEl("div", {
        //             cls: ["bearings-entry-node-relationships-container"],
        //         });
        //         let relEl = this.elements.relationshipsContainer.createEl("div", {
        //             cls: ["bearings-entry-node-relationship-cell"],
        //         });
        //         relEl.innerText = relationshipPolarityGlyph;
        //     }
        // }

        this.elements.entryHeadContent = this.elements.entryHead.createEl("div", { cls: "bearings-entry-head-content"});

        this.elements.entryHeadLinkContainer = this.elements.entryHeadContent.createEl("div", { cls: "bearings-entry-head-link-container"});
        this.renderEntryLink(
            this.elements.entryHeadLinkContainer,
            entryData,
        );

        this.elements.entrySubcontent =  this.elements.entryMain.createEl("div", {
            cls: ["bearings-entry-subcontent"]
        });

        [ ... entryData.children]
            .sort( (a: FileNavigationTreeNode, b: FileNavigationTreeNode) => a.value.sort_key(b.value) )
            .forEach( (childNode: FileNavigationTreeNode) => {
                let subview = new NavigationEntryFrame(
                    this._context,
                    this.elements.entrySubcontent.createEl("div"),
                    this.parentViewFrame,
                    this.isFocalFile(entryData.value.filePath),
                );
                subview.setupCallbackFn = this.setupCallbackFn;
                subview.render(
                    childNode,
                    entryData.value,
                    subtreeDefaultOpenDepthLimit,
                );
        });


        if (this.isHighlightFocalFile) {
            if (this.isFocalFile(entryData.value.filePath)) {
                Object.values(this.elements).forEach( (p) => p.classList.add("bearings-is-focal-file-entry"));
            } else {
                this.elements.entryHeadLinkContainer.classList.remove("bearings-is-focal-file-entry");
            }
        } else {
            this.elements.entryHeadLinkContainer.classList.remove("bearings-is-focal-file-entry");
        }
        setIndicator();

    }

    renderEntryLink(
        root: HTMLElement,
        entryData: FileNavigationTreeNode,
    ) {
        let linkContainer = root.createEl("a", { cls: "bearings-entry-head-link"} );
        const linkPath = entryData.value.filePath;
        let linkDisplayText = entryData.value.indexEntryText;

        // linkContainer.innerText = entryData.value.indexEntryText;

        this.renderMarkdown(
            linkDisplayText,
            linkContainer,
            // linkPath,
        );
        linkContainer.addEventListener("mouseover", (event) => {
            this._context.app.workspace.trigger("hover-link", {
                event,
                source: VIEW_TYPE,
                hoverParent: linkContainer.parentElement,
                targetEl: linkContainer,
                linktext: linkPath,
            });
        });
        linkContainer.addEventListener('contextmenu', (event) => {
            const menu = new Menu()
            buildLinkOpenMenu(menu, this._context.app, linkPath)
            buildLinkCopyMenu(menu, linkPath)
            menu.showAtMouseEvent(event)
        })
        linkContainer.addEventListener('click', (event) => {
            event.preventDefault();
            const app = this._context.app;
            if (event.shiftKey || event.ctrlKey) {
                // shift or ctrl: new tab
                app.workspace.openLinkText(linkPath, "", "tab")
            } else if (event.altKey && event.ctrlKey) {
                // ctrl+alt: new split/pane
                app.workspace.openLinkText(linkPath, "", "split")
                // } else if (event.altKey && event.ctrlKey) {
                // 	app.workspace.openLinkText(linkPath, "", "window")
            } else {
                app.workspace.openLinkText(linkPath, "", false)
            }
        });

    }

    renderIcons() {
        this.elements.entryIconBox = this.elements.entryGutterLeftHead.createEl("div", {
            cls: ["bearings-entry-glyph-bar-container"]
        });
        // this.elements.entryIconBox.innerText = "∧"
        let nodeIcons: string[] = [
            ":scroll-text:",
            "🦉",
            "🦬",
            "🦣",
            "🦓",
        ];
        nodeIcons.forEach(iconCode => {
            const iconCell = this.elements.entryIconBox.createEl("div", {
                cls: ["bearings-entry-glyph-bar-cell"]
            });

            if (iconCode.startsWith(':') && iconCode.endsWith(':')) {
                const iconName = iconCode.slice(1, -1);
                // TODO: build the icon
                // iconCell.innerHTML = iconSVG;
            } else {
                // If not an icon code, add the string directly
                iconCell.textContent = iconCode;
            }
        });
    }

}

