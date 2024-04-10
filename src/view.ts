
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
    isBypassFileChangeCheck: boolean = false;

    async refresh() {
        this.render(this._context._focalFilePath, true);
        // this.render(this.app.workspace.getActiveFile()?.path || "", true);
    }

    get isFixed(): boolean {
        return false;
    }

    async render(
        targetFilePath: string,
        isForce: boolean = false,
    ) {
        if (!isForce) {
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
            cls: ["bearings-container"]
        });
        let viewHeaderContainer = this.viewContainer.createEl("div", {
            cls: ["bearings-container-header"]
        });
        let headerLeft = viewHeaderContainer.createEl("div", {
            cls: ["bearings-container-header-left"],
        });

        // Controls
        let controlRow = headerLeft.createEl("div", {cls: ["bearings-control-column"]});

        // Refresh button
        let refreshButton = new ButtonComponent(
            controlRow.createEl("div", {cls: [ "bearings-control-cell", ]})
        );
        refreshButton.setClass("bearings-control-button");
        refreshButton.setIcon("rotate-ccw");
        refreshButton.setTooltip("Refresh the view");
        const refreshAction = () => {
            this.refresh();
        };
        refreshButton.onClick( () => refreshAction() );

        // Div mocked as button
        let controlCell = controlRow.createEl("div", {cls: ["bearings-control-cell"]});
        let pinnedLabelContainer = controlCell.createEl("div", {cls: ["bearings-control-div-input-container"]})
        let pinnedLabel = pinnedLabelContainer.createEl("div", {cls: ["bearings-control-div-input-control", "bearings-control-div-input-toggle"]});
        const pinnedAction = (value: boolean) => {
            this.isPinned = value;
            if (this.isPinned) {
                // pinnedLabel.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin"><line x1="12" x2="12" y1="17" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`;
                setIcon(pinnedLabel, "pin");
                pinnedLabel.addClass("bearings-toggle-is-true");
                pinnedLabel.removeClass("bearings-toggle-is-false");
            } else {
                // pinnedLabel.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-off"><line x1="2" x2="22" y1="2" y2="22"/><line x1="12" x2="12" y1="17" y2="22"/><path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h12"/><path d="M15 9.34V6h1a2 2 0 0 0 0-4H7.89"/></svg>`;
                setIcon(pinnedLabel, "pin-off");
                pinnedLabel.addClass("bearings-toggle-is-false");
                pinnedLabel.removeClass("bearings-toggle-is-true");
            }
        };
        // linkContainer.onclick( () => pinnedAction(!this.isPinned) );
        pinnedLabel.addEventListener('click', (event) => {
            event.preventDefault();
            this.isPinned = !this.isPinned;
            pinnedAction(this.isPinned);
        });
        // pinnedToggle.setValue(this.isPinned)
        //     .onChange(async (value) => pinnedAction(value))
        pinnedAction(this.isPinned);


        let headerLabel = headerLeft.createEl("div", {
            cls: ["bearings-container-header-label"],
            text: this._context.dataService.getFileNode(this._context._focalFilePath).indexEntryText,
        });

        let headerRight = viewHeaderContainer.createEl("div", {
            cls: ["bearings-container-header-right"],
        });

        // this.viewContainer.createEl("div", {cls: "bearings-viewframe-section-title", text: "Contexts"});
        // this.viewContainer.createEl("div", {cls: "bearings-viewframe-section-title", text: "Centers"});
        // this.viewContainer.createEl("div", {cls: "bearings-viewframe-section-title", text: "Superordinates"});
        // this.viewContainer.createEl("div", {cls: "bearings-viewframe-section-title", text: "Provenances"});
        // this.viewContainer.createEl("div", {cls: "bearings-viewframe-section-title", text: "Polarities"});
        let ascenderViewFrame = new SuperordinateRelationshipsAscendersViewFrame(
            this._context,
            this.viewContainer.createEl("div", {cls: "bearings-viewframe-container"}),
            "Positions",
        );
        ascenderViewFrame.render();

        // this.viewContainer.createEl("div", {cls: "bearings-viewframe-section-title", text: "Parallels"});
        let parallelsViewFrame = new ParallelRelationshipsViewFrame(
            this._context,
            this.viewContainer.createEl("div", {cls: "bearings-viewframe-container"}),
            "Parallels"
        );
        parallelsViewFrame.render();

        // this.viewContainer.createEl("div", {cls: "bearings-viewframe-section-title", text: "Extensions"});
        // this.viewContainer.createEl("div", {cls: "bearings-viewframe-section-title", text: "Expansions"});
        // this.viewContainer.createEl("div", {cls: "bearings-viewframe-section-title", text: "Subtrees"});
        // this.viewContainer.createEl("div", {cls: "bearings-viewframe-section-title", text: "Extensions"});
        // let subordinateViewFrame = new SubordinateRelationshipsViewFrame(
        //     this._context,
        //     this.viewContainer.createEl("div", {cls: "bearings-viewframe-container"}),
        //     "Expansions",
        // );
        // subordinateViewFrame.render();

        // this.viewContainer.createEl("div", {cls: "bearings-viewframe-section-title", text: "Referrals"});
        let coordinateViewFrame = new CoordinateRelationshipsViewFrame(
            this._context,
            this.viewContainer.createEl("div", {cls: "bearings-viewframe-container"}),
            "Referrals",
        );
        coordinateViewFrame.render();

        // this.viewContainer.createEl("div", {cls: "bearings-viewframe-section-title", text: "Ventions"});
        let backlinkedViewFrame = new BacklinkedRelationshipsViewFrame(
            this._context,
            this.viewContainer.createEl("div", {cls: "bearings-viewframe-container"}),
            "Backlinks",
        );
        backlinkedViewFrame.render();

    }
}


class InputNumberComponent {
    private containerEl: HTMLElement;
    private minValue: number;
    private maxValue: number;
    private currentValue: number;
    private inputEl: HTMLInputElement;
    private label?: string;
    private onChangeCallback: (newValue: number | null) => void;
    isMapMinValueToNull: boolean = true;

    constructor(
        containerEl: HTMLElement,
        minValue: number,
        maxValue: number,
        initialValue: number,
        onChangeCallback: (newValue: number | null) => void,
        label?: string
    ) {
        this.containerEl = containerEl;
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.currentValue = initialValue;
        this.onChangeCallback = onChangeCallback;
        this.label = label;
        this.render();
    }

    private updateInputDisplay(): void {
        let displayValue: number | string = this.currentValue;
        if (this.currentValue === this.minValue && this.isMapMinValueToNull) {
            this.inputEl.value = "∞"
            this.inputEl.classList.add("is-null");
        } else {
            this.inputEl.value = displayValue.toString();
            this.inputEl.classList.remove("is-null");
        }
    }

    private onChange(): void {
        this.updateInputDisplay();
        this.onChangeCallback(this.currentValue);
    }

    private incrementValue(): void {
        if (this.currentValue < this.maxValue) {
            this.currentValue += 1;
        } else {
            // Cycle back to minValue when maxValue is exceeded
            this.currentValue = this.minValue;
        }
        this.onChange();
    }

    private decrementValue(): void {
        if (this.currentValue > this.minValue) {
            this.currentValue -= 1;
        } else {
            // Cycle forward to maxValue when minValue is undercut
            this.currentValue = this.maxValue;
        }
        this.onChange();
    }

    private render(): void {
        if (this.label) {
            const labelEl = this.containerEl.appendChild(document.createElement("label"));
            labelEl.classList.add("bearings-control-label");
            labelEl.textContent = this.label;
        }

        const inputAndButtonsContainer = this.containerEl.appendChild(document.createElement("div"));
        // inputAndButtonsContainer.classList.add("bearings-input-control-container");
        inputAndButtonsContainer.classList.add("bearings-control-input-number-container");

        this.inputEl = inputAndButtonsContainer.appendChild(document.createElement("input")) as HTMLInputElement;
        this.inputEl.setAttribute("type", "text");
        this.inputEl.classList.add("bearings-control-input-number");
        this.inputEl.addEventListener('input', () => {
            // Parse the input value or default to 0 if "Unlimited"
            const inputValue = this.inputEl.value === "Unlimited" ? this.minValue : parseInt(this.inputEl.value, this.maxValue);
            this.currentValue = isNaN(inputValue) ? this.minValue : inputValue;
            this.onChange();
        });
        this.updateInputDisplay();

        const decrementButton = inputAndButtonsContainer.appendChild(document.createElement("button"));
        decrementButton.textContent = "-";
        decrementButton.classList.add("bearings-control-button");
        decrementButton.addEventListener("click", () => this.decrementValue());

        const incrementButton = inputAndButtonsContainer.appendChild(document.createElement("button"));
        incrementButton.textContent = "+";
        incrementButton.classList.add("bearings-control-button");
        incrementButton.addEventListener("click", () => this.incrementValue());

        // const buttonsContainer = inputAndButtonsContainer.appendChild(document.createElement("div"));
        // buttonsContainer.style.display = "flex";
        // buttonsContainer.style.flexDirection = "row";
        // buttonsContainer.style.marginLeft = "5px"; // Spacing between input and buttons

        // const incrementButton = buttonsContainer.appendChild(document.createElement("button"));
        // incrementButton.textContent = "+";
        // incrementButton.classList.add("bearings-control-button");
        // incrementButton.addEventListener("click", () => this.incrementValue());

        // const decrementButton = buttonsContainer.appendChild(document.createElement("button"));
        // decrementButton.textContent = "-";
        // decrementButton.classList.add("bearings-control-button");
        // decrementButton.addEventListener("click", () => this.decrementValue());
    }
}



abstract class NavigationViewFrame extends NavigationBase {
    root: HTMLElement;
    viewFrame: HTMLElement;
    viewPort: HTMLElement;
    title: string;
    _discoveryDepthLimit: number | null;
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

    getDefaultDiscoveryDepthLimit(): number | null {
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
        // let discoveryDepthLimitInput = getControlCell().createEl("input", {
        //     type: "number",
        //     cls: "bearings-control-number"
        // });
        // let minRange = "0";
        // let maxRange = "20";
        // let initialValue = "20";
        // discoveryDepthLimitInput.setAttribute("min", minRange);
        // discoveryDepthLimitInput.setAttribute("max", maxRange);
        // discoveryDepthLimitInput.setAttribute("step", "1");

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
                );
                viewEntry.setupCallbackFn = (
                                             entryFrame: NavigationEntryFrame,
                                             entryData: FileNavigationTreeNode,
                                            ) => this.setLocalOptions(entryFrame, entryData);
                // this.setLocalOptions(viewEntry, entryData);
                viewEntry.render(
                    entryData,
                    results.parentFileNode || undefined,
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
        return this._validateDepthLimitSetting(this._context.configuration.options.viewDepthLimitPrimary);
    }

    setLocalOptions(
        entryFrame: NavigationEntryFrame,
        entryData: FileNavigationTreeNode,
    ) {
        let isDefaultOpenFocalFile = false;
        if (this.isFocalFile(entryData.value.filePath)) {
            this.nFocalFileSeen = this.nFocalFileSeen + 1;
        }
        if (!this.isFocalFileExpandedOnce && this.isFocalFile(entryData.value.filePath)) {
            this.isFocalFileExpandedOnce = true;
            isDefaultOpenFocalFile = true;
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
        return this._validateDepthLimitSetting(this._context.configuration.options.viewDepthLimitSecondary);
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
        return this._validateDepthLimitSetting(this._context.configuration.options.viewDepthLimitSecondary);
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
        return this._validateDepthLimitSetting(this._context.configuration.options.viewDepthLimitSecondary);
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
        return this._validateDepthLimitSetting(this._context.configuration.options.viewDepthLimitSecondary);
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

    constructor(
        navigationContext: NavigationContext,
        root: HTMLElement,
        parentViewFrame: NavigationViewFrame,
    ) {
        super(
            navigationContext,
            root,
        );
        this.parentViewFrame = parentViewFrame;
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
    ) {
        if (this.setupCallbackFn !== undefined) {
            this.setupCallbackFn(this, entryData);
        }
        if (this.parentViewFrame.isForceOpen === true) {
            this.isOpen = true;
        } else if (this.parentViewFrame.isForceOpen === false) {
            this.isOpen = false;
        } else {
            // this.isOpen = this.isOpen ??
            //     (this.isFocalFile(entryData.value.filePath) ? this.isDefaultOpenFocalFile : this.isDefaultOpen );
            this.isOpen = (this.isFocalFile(entryData.value.filePath) ? this.isDefaultOpenFocalFile : this.isDefaultOpen );
        }
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
                    cls: ["bearings-entry-node-relationships-container"],
                });
                let relEl = this.elements.relationshipsContainer.createEl("div", {
                    cls: ["bearings-entry-node-relationship-cell"],
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
                );
                subview.setupCallbackFn = this.setupCallbackFn;
                subview.render( childNode, entryData.value );
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

