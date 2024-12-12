
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

import {
    SelectFileModal,
} from "./SelectFile";

import {
    DataService,
    RelationshipLinkedPathDataType,
    FileNodeDataRecords,
    FileNavigationTreeNode,
    FileNode,
    FileNodeDataType,
    FilePathType,
    FilePathNodeMapType,
} from "./dataservice";

import {
    DEFAULT_TITLE_FIELDS,
    BearingsConfiguration,
    RelationshipDefinition,
} from "./settings";

import {
    buildLinkCopyMenu,
    buildLinkOpenMenu,
    buildLinkTargetEditMenu,
} from "./menus"

import {
    InputNumberComponent,
} from "./InputNumber"

export const VIEW_TYPE = "bearings-navigator-view";
export const DISPLAY_TEXT = "Bearings";



// const OUTLINKED_RELATIONSHIP_GLYPH = "↤";
// const INLINKED_RELATIONSHIP_GLYPH = "↦";
// const BILINKED_RELATIONSHIP_GLYPH = "⇌";
// const OUTLINKED_RELATIONSHIP_GLYPH = "━━➡";
// const INLINKED_RELATIONSHIP_GLYPH = "⬅━━";
// const BILINKED_RELATIONSHIP_GLYPH = "⬅━➡";
// const OUTLINKED_RELATIONSHIP_GLYPH = "━➡";
// const INLINKED_RELATIONSHIP_GLYPH = "⬅━";
// const OUTLINKED_RELATIONSHIP_GLYPH = "➡";
// const INLINKED_RELATIONSHIP_GLYPH = "⬅";
// const BILINKED_RELATIONSHIP_GLYPH = "⬅➡";

// const OUTLINKED_RELATIONSHIP_GLYPH = "⇽";
// const INLINKED_RELATIONSHIP_GLYPH = "⇾";
// const BILINKED_RELATIONSHIP_GLYPH = "⇿";

// ↑ ↓ ← → ⇐ ⇒ ⇑ ⇓ ⇐ ⇾ ⇽ ⇿
const OUTLINKED_RELATIONSHIP_GLYPH = "🡐";
const INLINKED_RELATIONSHIP_GLYPH = "🡒";
const BILINKED_RELATIONSHIP_GLYPH = "🡘";


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
        let activeFilePath = this.plugin.app.workspace.getActiveFile()?.path || "";
        if (!activeFilePath || activeFilePath === "") {
            if (this.configuration.options.inactiveFileFocalNote) {
                activeFilePath = this.configuration.options.inactiveFileFocalNote;
                if (activeFilePath) {
                    activeFilePath = activeFilePath.replace(/^\[\[/,"").replace(/\]\]/, "");
                    if (!activeFilePath.endsWith(".md")) {
                        activeFilePath = activeFilePath + ".md";
                    }
                }
            }
        }
        return activeFilePath;
    }

    getViewType() {
        return VIEW_TYPE;
    }

    getDisplayText() {
        return DISPLAY_TEXT;
    }

    async refresh() {
        // await this.dataService.refresh();
        await this.render();
    }

    async onActiveLeafChange() {
        await this.render();
    }

    async onOpen() {
        this.app.workspace.on('active-leaf-change', this.onActiveLeafChange);
        await this.render();
    }

    async render() {
        // await this.dataService.refresh();
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
                async () => {
                    // await this.dataService.refresh();
                    await this.render();
                },
                true,
            );
            this.navigationView = new NavigationView(
                navigationContext,
                this.root,
            );
        }
        let focalFilePath = this.computeActiveFilePath()
        // this.focalFileHistory.push(focalFilePath);
        // console.log(`R1: ${focalFilePath}`);
        this.navigationView.render(focalFilePath);
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
    updateCallbackFn: () => Promise<void>;
    isOpenFocalFile: boolean = false;

    constructor(
        app: App,
        configuration: BearingsConfiguration,
        dataService: DataService,
        focalFilePath: string,
        updateCallbackFn: () => Promise<void>,
        isOpenFocalFile: boolean,
    ) {
        this.app = app;
        this.configuration = configuration;
        this.dataService = dataService;
        this._focalFilePath = focalFilePath;
        this.updateCallbackFn = updateCallbackFn;
        this.isOpenFocalFile = isOpenFocalFile;
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
        MarkdownRenderer.render(
            this._context.app,
            text,
            element,
            sourcePath,
            this,
        )
    }

}

export class NavigationView extends NavigationBase {

    viewContainer: HTMLElement;
    isClosed: boolean = true;
    isBypassFileChangeCheck: boolean = false;
    toggleOptionState: { [key: string]: boolean } = {};

    constructor(
        navigationContext: NavigationContext,
        root: HTMLElement,
    ) {
        super(
            navigationContext,
            root,
        );
        // this._context.updateCallbackFn = this.refresh;
    }


    async refresh(
        options: { [key: string]: boolean } = {},
    ) {
        await this._context.dataService.refresh();
        await this.render(this._context._focalFilePath, {
            ... options,
            isForced: true,
        });
        // this.render(this.app.workspace.getActiveFile()?.path || "", true);
    }

    get isFixed(): boolean {
        return false;
    }

    get isPinned(): boolean {
        return this.toggleOptionState["isPinned"] ?? false;
    }

    createToggleButton(
        key: string,
        controlRow: HTMLElement,
        trueGlyph: string,
        falseGlyph: string,
        trueToolTip: string,
        falseToolTip: string,
        callbackAction: (value: boolean) => void,
        initialValue: boolean,
    ) {
        let button = new ButtonComponent(
            controlRow.createEl("div", {cls: [ "bearings-control-cell", ]})
        );
        // console.log("Creating toggle");
        button.setClass("bearings-control-button");
        this.toggleOptionState[key] = initialValue;
        const setToggle = () => {
            if (this.toggleOptionState[key]) {
                // console.log("TOGGLE T");
                button.setIcon(trueGlyph);
                button.setTooltip(trueToolTip);
                // button.classList.add("bearings-toggle-is-true");
                // button.removeClass("bearings-toggle-is-false");
            } else {
                // console.log("TOGGLE F");
                button.setIcon(falseGlyph);
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
        // console.log(`R2: ${targetFilePath}`);
        // console.log(this.isPinned);
        // console.log(this.isBypassFileChangeCheck);
        // console.log(options);
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
        // console.log(`Rendering focal file: ${this._context._focalFilePath}`);

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

        let headerRight = viewHeaderContainer.createEl("div", {
            cls: ["bearings-main-container-header-right"],
        });

        let controlsSide = headerLeft;
        let mainSide = headerRight;

        // Controls
        let controlRow = controlsSide.createEl("div", {cls: ["bearings-control-row"]});


        if (!options.isCodeBlock) {
            let findButton = new ButtonComponent(
                controlRow.createEl("div", {cls: [ "bearings-control-cell", ]})
            );
            findButton.setClass("bearings-control-button");
            findButton.setIcon("search");
            findButton.setTooltip("Change the view focal note without changing the active note");
            const findAction = () => {
                const modal = new SelectFileModal(
                    this._context.app,
                    this._context.configuration,
                    (path: string) => this.render(path, options),
                );
                    modal.open();
            };
            findButton.onClick( () => findAction() );
            this.createToggleButton(
                "isPinned",
                controlRow,
                "circle-dot",
                "circle-dot-dashed",
                // "radius",
                // "refresh-ccw-dot",
                "Unpin the focal note: it will track your active file",
                "Pin the focal note: it will not change as you switch files",
                (value: boolean) => {
                    // this.isPinned = value;
                    this.refresh(options);
                },
                this.isPinned,
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

        const fileNode = this._context.dataService.getFileNode(this._context._focalFilePath);
        let headerLabelContainer = mainSide.createEl("div", {
            cls: ["bearings-main-container-header-label-container"],
        });
        // let headerPrefix = headerLabelContainer.createEl("div", {
        //     cls: ["bearings-main-container-header-label-prefix"],
        //     text: fileNode.fileData?.frontMatterCache?.["title-prefix"] || "hello",
        // });
        let headerLabel = headerLabelContainer.createEl("div", {
            cls: ["bearings-main-container-header-label-title"],
            text: fileNode.indexEntryText,
        });

        // let controlRowRight = headerRight.createEl("div", {cls: ["bearings-control-row"]});
        // let prevButton = new ButtonComponent(
        //     controlRowRight.createEl("div", {cls: [ "bearings-control-cell", ]})
        // );
        // prevButton.setClass("bearings-control-button");
        // prevButton.setIcon("rotate-ccw");
        // prevButton.setTooltip("Refresh the view");
        // const prevAction = () => {
        //     console.log(this.focalFileHistory);
        // };
        // prevButton.onClick( () => prevAction() );
        // let nextButton = new ButtonComponent(
        //     controlRowRight.createEl("div", {cls: [ "bearings-control-cell", ]})
        // );
        // nextButton.setClass("bearings-control-button");
        // nextButton.setIcon("rotate-ccw");
        // nextButton.setTooltip("Refresh the view");
        // const nextAction = () => {
        //     console.log(this.focalFileHistory);
        // };
        // nextButton.onClick( () => nextAction() );


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

        let symmetricalViewFrame = new CoordinateRelationshipsViewFrame(
            this._context,
            viewContainerBody.createEl("div", {cls: "bearings-viewframe-container"}),
            "Crosslinks",
        );
        symmetricalViewFrame.render();

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
            this._autoexpansionDepthLimit = this.getDefaultAutoexpansionDepthLimit();
        }
        return this._autoexpansionDepthLimit;
    }


    getDefaultDiscoveryDepthLimit(): number | null {
        return this._context.configuration.options.discoveryDepthLimitPrimary;
    }

    getDefaultAutoexpansionDepthLimit(): number | null {
        return this._context.configuration.options.autoexpansionDepthLimit;
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
            entryFrame.isPostFocalFile = true;
        }
        if (!this.isFocalFileExpandedOnce && this.isFocalFile(entryData.value.filePath)) {
            this.isFocalFileExpandedOnce = true;
            isDefaultOpenFocalFile = true;
        }
        if (!entryFrame.isPostFocalFile && !this.isFocalFile(entryData.value.filePath)) {
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
            this._context.configuration.symmetricalRelationshipDefinitions(),
            this._context.configuration.superordinateRelationshipDefinitions(),
            this.discoveryDepthLimit,
        )

        return {
            treeNodes: [... subtreeRoot.children],
            parentFileNode: subtreeRoot.value,
        };
        // return {
        //     treeNodes: [subtreeRoot],
        // };
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
        entryFrame.options.isOpenFocalFile = true;
        entryFrame.options.isDefaultOpen = true;
        entryFrame.options.isIgnoreDefaultOpenLimit = true;
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
        } else if (this.parentViewFrame.isForceOpen === false) {
            this.isOpen = false;
        } else {
            if (this.isFocalFile(entryData.value.filePath)) {
                this.isOpen = this.isDefaultOpenFocalFile;
            } else if (this.options.isIgnoreDefaultOpenLimit) {
                this.isOpen = this.isDefaultOpen;
                subtreeDefaultOpenDepthLimit = defaultOpenDepthLimit;
            } else {
                this.isOpen = defaultOpenDepthLimit === null ? true : defaultOpenDepthLimit > 0;
            }
        }

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
        // if (relationships.length > 0) {
            let relationshipDesc: string[] = relationships.map( (relationship: RelationshipLinkedPathDataType) => {
                if (relationship.isInlink) {
                    return `${relationship.relationshipKey}${INLINKED_RELATIONSHIP_GLYPH}`;
                } else {
                    return `${OUTLINKED_RELATIONSHIP_GLYPH}${relationship.relationshipKey}`;
                }
            });
            relationshipDesc = [ ... new Set<string>(relationshipDesc)].sort()
            const complementaryRelationships: RelationshipLinkedPathDataType[] = relationships.filter( (relationship: RelationshipLinkedPathDataType) => relationship.isInlink );
            let relationshipPolarityGlyph: string = "";
            if (complementaryRelationships.length === 0) {
                relationshipPolarityGlyph = OUTLINKED_RELATIONSHIP_GLYPH;
            } else if (complementaryRelationships.length === relationships.length) {
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
                relEl.setAttribute("title", relationshipDesc.join("; "));
            }
        // }

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
                // let terminal: string = "⏺";
                // let terminal: string = "⨀";
                // let terminal: string = "⨁";
                // let terminal: string = "⟦";
                // let terminal: string = "⟴";
                // let terminal: string = "¶";
                // let terminal: string = "§";
                // let terminal: string = "☗";
                // let terminal: string = "⧫";
                let terminal: string = "🠷";
                // let terminal: string = "⧳";
                // let terminal: string = "⯌";
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
        //     const complementaryRelationships: RelationshipLinkedPathDataType[] = relationships.filter( (relationship: RelationshipLinkedPathDataType) => relationship.isInlink );
        //     let relationshipPolarityGlyph: string = "";
        //     if (complementaryRelationships.length === 0) {
        //         relationshipPolarityGlyph = OUTLINKED_RELATIONSHIP_GLYPH;
        //     } else if (complementaryRelationships.length === relationships.length) {
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
        //
        // this.elements.entryGlyphRow = this.elements.entryHeadContent.createEl("div");
        // if (relationshipDesc.length > 0) {
        //     this.elements.entryRelationshipDescription = this.elements.entryHeadContent.createEl("div", { cls: "bearings-entry-head-link-container"});
        //     this.elements.entryRelationshipDescription.innerText = relationshipDesc.join("/");
        // }



        this.elements.entryHeadLinkContainer = this.elements.entryHeadContent.createEl("div", { cls: "bearings-entry-head-link-container"});


        this.renderEntryLink(
            this.elements.entryHeadLinkContainer,
            entryData,
        );
        this.renderGlyphs(
            this.elements.entryHeadLinkContainer,
            entryData,
            ["bearings-entry-glyph-inline-container"],
            ["bearings-entry-glyph-inline-cell"],
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
                    this.isFocalFile(entryData.value.filePath) || this.isPostFocalFile,
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

        const linkPath = entryData.value.filePath;
        let linkContainer = root.createEl("a", { cls: ["bearing-entry-head-link", "bearings-entry-head-link-container"]} );
        let linkTitleContainer = linkContainer.createEl("div", { cls: ["bearing-entry-head-link", "bearings-entry-head-link-title-container"]} );
        let titlePrefix = entryData.value.indexEntryPrefix;
        if (titlePrefix) {
            let linkTitlePrefixContainer = linkTitleContainer.createEl("div", { cls: ["bearing-entry-head-link", "bearings-entry-head-link-title-prefix"]} );
            // let prefixes = titlePrefix.split("/");
            // let prefixes = titlePrefix.split(/(\/|::)/);
            let prefixes = titlePrefix.split(/(?:\/|::)/);
            prefixes.forEach( (prefix: string, index: number) => {
                prefix = prefix.trim();
                this.renderMarkdown(
                    prefix,
                    linkTitlePrefixContainer,
                );
                if (index < prefixes.length - 1) {
                    let bulletElement = linkTitlePrefixContainer.createEl("span", { cls: "bearings-title-prefix-infix-separator" });
                    bulletElement.setText("⦁");
                }
            });
            linkTitlePrefixContainer.classList.add("bearings-entry-head-link-has-title-prefix");
        }
        let linkTitleLabelContainer = linkTitleContainer.createEl("div", { cls: ["bearing-entry-head-link", "bearings-entry-head-link-title-text"]} );
        this.renderMarkdown(
            entryData.value.indexEntryTextWithoutPrefix,
            linkTitleLabelContainer,
        );

        // let linkContainer = root.createEl("a", { cls: "bearings-entry-head-link"} );
        // const linkPath = entryData.value.filePath;
        // let linkDisplayText = entryData.value.indexEntryText;
        // this.renderMarkdown(
        //     linkDisplayText,
        //     linkContainer,
        //     // linkPath,
        // );

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
            const menu = new Menu();
            buildLinkOpenMenu(menu, this._context.app, linkPath);
            buildLinkTargetEditMenu(
                this._context.app,
                this._context.configuration,
                menu,
                linkPath,
                // this._context._focalFilePath,
                this._context.updateCallbackFn,
                true,
            );
            buildLinkCopyMenu(menu,  this._context.app, linkPath);
            menu.showAtMouseEvent(event);
        });
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

    renderGlyphs(
        root: HTMLElement,
        entryData: FileNavigationTreeNode,
        containerClassNames: string[] = [],
        cellClassNames: string[] = [],
    ) {
        this.elements.entryGlyphBox = root.createEl("div", {
            cls: containerClassNames,
        });
        // Defaults needed here as data.json created under previous API will not be populated
        // with these newer fields.
        let nodeGlyphFields = this._context.configuration.options?.glyphField || ["glyphs", "entry-glyphs"];
        let glyphs: string[] = Array
            .from(new Set<string>(entryData.value.readGlyphs( nodeGlyphFields, null,)))
        if (glyphs.length === 0) {
            this.elements.entryGlyphBox.classList.add("is-empty");
        }
        glyphs.forEach(glyphCode => {
                const glyphCell = this.elements.entryGlyphBox.createEl("div", {
                    cls: cellClassNames,
                });
                if (false && glyphCode.startsWith(':') && glyphCode.endsWith(':')) {
                    const glyphName = glyphCode.slice(1, -1);
                } else {
                    glyphCell.textContent = glyphCode;
                }
            });
    }

}

