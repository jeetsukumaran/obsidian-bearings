import {
    Notice,
    normalizePath,
    FrontMatterCache,
    TFile,
    CachedMetadata,
    App,
} from 'obsidian';

import {
    DEFAULT_TITLE_PREFIX_FIELD,
    DEFAULT_TITLE_FIELDS,
    RelationshipDefinition,
    BearingsConfiguration,
} from "./settings";

let getFileBaseName = (value: string) => value.split('\\')?.pop()?.split('/').pop() || value;

// ** Dataview **
// Available at `app.plugins.plugins.dataview.api` or as global `DataviewAPI`)
// Set up for development against:
//	```
//	npm install -D obsidian-dataview
//  ```
// https://blacksmithgu.github.io/obsidian-dataview/resources/develop-against-dataview/
import {
    DataviewApi,
    // DataArray,
    // DataObject,
    Link,
    Literal,
    getAPI,
} from "obsidian-dataview";
// export type DataviewPage = Record<string, Literal>; // aka Dataview "page"
export interface DataviewPage {
    file: { [key: string]: any },
    frontMatterCache: FrontMatterCache,
};
export type FileNodeDataRecords = DataviewPage;
export type FileNodeDataType = Literal;


export function mapDataviewRecords(page: Record<string, Literal>): FileNodeDataRecords {
        let result = {
            file: page.file,
            frontMatterCache: page,
        };
        return result;
}
// From: <https://forum.obsidian.md/t/getting-backlinks-tags-and-frontmatter-entries-for-a-note/34082/2>
//
// ```
// file = app.vault.getAbstractFileByPath("your/file.md")
// ```
// - `metadata` contains all values except backlinks: <https://github.com/obsidianmd/obsidian-api/blob/c01fc3074deeb3dfc6ee02546d113b448735b294/obsidian.d.ts#L388-L425>
//
// links?: LinkCache[];
// embeds?: EmbedCache[];
// tags?: TagCache[];
// headings?: HeadingCache[];
// sections?: SectionCache[];
// listItems?: ListItemCache[];
// frontmatter?: FrontMatterCache;
// blocks?: Record<string, BlockCache
//
// - If a file has no frontmatter, `metadata.frontmatter` will not exist
// - Tags need to be collected in two places:
//  -   `metadata.frontmatter.tags`
//  -   `metadata.tags`
// ```
// metadata = app.metadataCache.getFileCache(file)
// ```

// ```
// backlinks = app.vault.metadataCache.getBacklinksForFile(file)
// ```

export function getMetadata(
    app: App,
    filePathOrFile?: string | TFile,
): CachedMetadata | null {
    let file: TFile | undefined;

    if (typeof filePathOrFile === 'string') {
        file = app.vault.getAbstractFileByPath(normalizePath(filePathOrFile)) as TFile;
    } else if (filePathOrFile instanceof TFile) {
        file = filePathOrFile;
    }

    if (!file) {
        return null;
    }

    return app.metadataCache.getFileCache(file) || null;
}

export function extractTags(metadata: CachedMetadata | null): string[] {
    if (metadata === null) {
        return [];
    }
    const tagSet = new Set<string>();

    // Collect tags from metadata.tags
    if (metadata.tags) {
        metadata.tags.forEach((tag) => {
            tagSet.add(tag.tag.replace(/^#/,""));
        });
    }

    // Collect tags from metadata.frontmatter.tags
    if (metadata.frontmatter && Array.isArray(metadata.frontmatter.tags)) {
        metadata.frontmatter.tags.forEach((tag: string) => {
            tagSet.add(tag);
        });
    }

    return Array.from(tagSet);
}

export function getFrontMatter(
    app: App,
    filePath?: string,
    file?: TFile,
): FrontMatterCache {
    if (filePath) {
        let afile = app.vault.getFileByPath(normalizePath(filePath));
        if (afile) {
            file = afile;
        } else {
            return {};
        }
    }
    if (!file) {
        return {};
    }
    return app.metadataCache.getFileCache(file)?.frontmatter || {};
}

export function getDisplayTitle(
    app: App,
    configuration: BearingsConfiguration,
    filePath?: string,
    file?: TFile,
    isIncludePrefix: boolean = true,
    defaultTitle: string = ""): string {
        const frontMatter = getFrontMatter(app, filePath, file);
        return getFrontMatterDisplayTitle(
            configuration,
            frontMatter,
            isIncludePrefix,
            defaultTitle,
        );
}

export function getFrontMatterDisplayTitle(
    configuration: BearingsConfiguration,
    frontMatterCache: FrontMatterCache | undefined,
    isIncludePrefix: boolean = true,
    defaultTitle: string = "",
): string {
    let result: string = defaultTitle;
    let propertyNames: string[] = configuration.options["titleField"] || DEFAULT_TITLE_FIELDS;
    propertyNames.forEach( (propertyName: string) => {
        if (frontMatterCache && frontMatterCache[propertyName]) {
            result = String(frontMatterCache[propertyName]);
            return result;
        }
    });
    if (isIncludePrefix) {
        let titlePrefixKey = configuration.options["titlePrefix"] || DEFAULT_TITLE_PREFIX_FIELD;
        if (titlePrefixKey && frontMatterCache && frontMatterCache[titlePrefixKey]) {
            let value = frontMatterCache[titlePrefixKey].trim();
            if (value) {
                result = `${value} ${result}`;
            }
        }
    }
    return result;
}


export class FileNodeData {

    // From: <https://forum.obsidian.md/t/getting-backlinks-tags-and-frontmatter-entries-for-a-note/34082/2>
    //
    // ```
    // file = app.vault.getAbstractFileByPath("your/file.md")
    // ```
    // - `metadata` contains all values except backlinks: <https://github.com/obsidianmd/obsidian-api/blob/c01fc3074deeb3dfc6ee02546d113b448735b294/obsidian.d.ts#L388-L425>
    //
    // links?: LinkCache[];
    // embeds?: EmbedCache[];
    // tags?: TagCache[];
    // headings?: HeadingCache[];
    // sections?: SectionCache[];
    // listItems?: ListItemCache[];
    // frontmatter?: FrontMatterCache;
    // blocks?: Record<string, BlockCache
    //
    // - If a file has no frontmatter, `metadata.frontmatter` will not exist
    // - Tags need to be collected in two places:
    //  -   `metadata.frontmatter.tags`
    //  -   `metadata.tags`
    // ```
    // metadata = app.metadataCache.getFileCache(file)
    // ```

    // ```
    // backlinks = app.vault.metadataCache.getBacklinksForFile(file)
    // ```
}


import {
    TreeNode,
} from "./graph";

export function Cacheable(...keyParams: string[]) {
    return function(target: any, propertyName: string, propertyDescriptor: PropertyDescriptor): PropertyDescriptor {
        const method = propertyDescriptor.value;
        propertyDescriptor.value = function (...args: any[]) {
            // Initialize cache storage on the instance if not already initialized
            if (!this.cache) {
                this.cache = new Map();
            }

            // Create an array to hold the values of the arguments used for the cache key
            const keyValues = keyParams.map((param, index) => args[index]);

            // Use method name and specified arguments to create a unique key for caching
            const cacheKey = `${propertyName}_${JSON.stringify(keyValues)}`;

            // Check if the result is already in the cache
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            // Call the original method and cache its result
            const result = method.apply(this, args);
            this.cache.set(cacheKey, result);
            return result;
        };
        return propertyDescriptor;
    };
}

export type FilePathType = string;

// export class FileNavigationTreeNode extends TreeNode<FileNode> {

//     sort_key(other: FileNavigationTreeNode): number {
//         return this.value.sort_key(other.value);
//     }

// }

export type FileNavigationTreeNode = TreeNode<FileNode>;

export type SuperordinateChains = {
    rootNodes: FileNavigationTreeNode[];
    leafNodes: FileNavigationTreeNode[];
}

export type RelationshipLinkedPathDataType = {
    relationshipKey: string,
    isInlink: boolean,
};
export type FilePathNodeMapType = Map<FilePathType, FileNode>;
export type PathAliasesMapType = { [filePath: string]: string[] };


export class DataService {
    app: App;
    configuration: BearingsConfiguration;
    _dataviewApi: DataviewApi;
    _vaultFileRecords: FileNodeDataRecords[] = [];
    _isDataviewUnavailableMessageSent: boolean = false;
    _glyphFilePathNodeMap: FilePathNodeMapType;

    constructor(
        app: App,
        configuration: BearingsConfiguration,
    ) {
        this.app = app;
        this.configuration = configuration;
        this.refresh();
    }

    get dataviewApi() {
        if (!this._dataviewApi) {
            this._dataviewApi = getAPI();
            if (!this._dataviewApi && !this._isDataviewUnavailableMessageSent) {
                let message = "Bearings: Unable to acquire Dataview API. is Dataview installed and enabled?"
                new Notice(message);
                console.log(message);
                this._isDataviewUnavailableMessageSent = true;
            }
        }
        return this._dataviewApi;
    }

    get glyphFilePathNodeMap(): FilePathNodeMapType {
        if (this._glyphFilePathNodeMap === undefined) {
            this._glyphFilePathNodeMap = new Map<FilePathType, FileNode>();
        }
        return this._glyphFilePathNodeMap;
    }


    readFileNodeDataRecords(filePath: string): FileNodeDataRecords | null {
        // Need to transform strings in lists to links
        // let frontmatter = getFrontMatter(this.app, filePath, undefined);
        // return this.postProcessMetadata(frontmatter);
        // return this.dataviewApi?.page(filePath) || null;
        let page = this.dataviewApi?.page(filePath) || null;
        if (page === null) {
            return null;
        }
        return mapDataviewRecords(page);
    }

    refresh(): FileNodeDataRecords[] {
        // this._vaultFileRecords = this.dataviewApi?.pages()?.array() || [];
        this._vaultFileRecords = (this.dataviewApi?.pages()?.array() || []).map(mapDataviewRecords);
        // this._vaultFileRecords = this.app.vault
        //     .getMarkdownFiles()
        //     .map((file: TFile) => {
        //         // let fileMetadata = getMetadata(this.app, file);
        //         // let frontmatter = fileMetadata?.frontmatter || {};
        //         return {
        //             file: file,
        //             frontMatterCache: getFrontMatter(this.app, undefined, file),
        //         }
        //         // Need to transform strings in lists to links
        //     });
        this._glyphFilePathNodeMap = new Map<FilePathType, FileNode>();
        return this._vaultFileRecords;
    }

    get vaultFileRecords(): FileNodeDataRecords[]  {
        if (!this._vaultFileRecords || this._vaultFileRecords.length === 0) {
            return this.refresh();
        }
        return this._vaultFileRecords;
    }

    superordinateChains(
        filePath: string,
        relationshipDefinitions: RelationshipDefinition[],
        isExpandSelfSubtree: boolean = false,
        selfSubtreeDepthLimit: number | null = null,
    ): FileNavigationTreeNode[] {
        let startFileNode = this.getFileNode(filePath);
        let filePathNodeMap = new Map<FilePathType, FileNode>();
        let startChildren: FileNavigationTreeNode[] = [];
        if (isExpandSelfSubtree) {
            startChildren = [... startFileNode.subordinateSubtrees(
                "standard",
                relationshipDefinitions,
                selfSubtreeDepthLimit,
                filePathNodeMap,
            ).children];
        }
        let superordinateWalkData = startFileNode.superordinateChains(
            "standard",
            relationshipDefinitions,
            null,
            filePathNodeMap,
        );
        let results = superordinateWalkData.rootNodes;
        if (startChildren.length > 0) {
            superordinateWalkData.leafNodes.forEach( (leafNode: FileNavigationTreeNode) => {
                leafNode.children = [... startChildren];
            });
        }
        return results;
    }

    subordinateSubtrees(
        filePath: string,
        relationshipDefinitions: RelationshipDefinition[],
        limitDepth: number | null = null,
        filePathNodeMap?: FilePathNodeMapType,
    ): FileNavigationTreeNode {
        if (!filePathNodeMap) {
            filePathNodeMap = new Map<FilePathType, FileNode>();
        }
        let startFileNode = filePathNodeMap.get(filePath) || this.getFileNode(filePath);
        filePathNodeMap.set(filePath, startFileNode) // not tested
        return startFileNode.subordinateSubtrees(
            "standard",
            relationshipDefinitions,
            limitDepth,
            filePathNodeMap,
        )
        // .sortChildren( (a: FileNavigationTreeNode, b: FileNavigationTreeNode) => {
        //     return a.value.sort_key(b.value);
        // });
    }

    coordinateSubtrees(
        filePath: string,
        relationshipDefinitions: RelationshipDefinition[],
        secondaryRelationshipDefinitions: RelationshipDefinition[],
        limitDepth: number | null = null,
        filePathNodeMap?: FilePathNodeMapType,
    ): FileNavigationTreeNode {
        if (!filePathNodeMap) {
            filePathNodeMap = new Map<FilePathType, FileNode>();
        }
        let startFileNode = filePathNodeMap.get(filePath) || this.getFileNode(filePath);
        filePathNodeMap.set(filePath, startFileNode) // not tested
        return startFileNode.coordinateSubtrees(
                "standard",
                relationshipDefinitions,
                secondaryRelationshipDefinitions,
                limitDepth,
                filePathNodeMap,
        )
            // .sortChildren( (a: FileNavigationTreeNode, b: FileNavigationTreeNode) => {
            //     return a.value.sort_key(b.value);
            // });

            // .sort( (a: FileNavigationTreeNode, b: FileNavigationTreeNode) => {
            //     return a.value.sort_key(b.value);
            // });
    }

    getFileNode(filePath: string): FileNode {
        let fileNode = new FileNode(
            filePath,
            this,
            null,
        );
        return fileNode;
    }

}

export class FileNode {
    filePath: string;
    fileBaseName: string;
    dataService: DataService;
    fileData: FileNodeDataRecords | null;
    _superordinateChains: SuperordinateChains;
    displayText: string | null;
    relationships: { [filePath: FilePathType]: RelationshipLinkedPathDataType[] } = {};

    protected _cache: { [key: string]: string } = {}

    constructor(
        filePath: string,
        dataService: DataService,
        displayText: string | null,
    ) {
        this.filePath = filePath;
        this.dataService = dataService;
        this.fileBaseName = getFileBaseName(filePath);
        this.fileData = this.dataService.readFileNodeDataRecords(filePath);
        this.displayText = displayText;
    }

    public createNewFileNavigationTreeNode(): FileNavigationTreeNode {
        // return new FileNavigationTreeNode(this);
        return new TreeNode<FileNode>(this);
    }

    async isExists(): Promise<boolean> {
        return this.dataService.app.vault.getAbstractFileByPath(this.filePath) !== null;
    }

    protected _memoize(
      key: string,
      fn: () => string,
    ): string {
      if (!this._cache[key]) {
        this._cache[key] = fn()
      }
      return this._cache[key]
    }

    public createNew(
        filePath: string,
        displayText: string | null = null,
    ): FileNode {
        return new FileNode(
            filePath,
            this.dataService,
            displayText,
        );
    }

    public registerRelationship(
        filePath: FilePathType,
        relationshipData: RelationshipLinkedPathDataType,
    ) {
        if (!this.relationships[filePath]) {
            this.relationships[filePath] = [];
        }
        this.relationships[filePath].push({
            ... relationshipData,
        })
    }

    public readDesignatedPropertyPaths(
        propertyName: string,
        pathAliases?: PathAliasesMapType,
    ): string[] {
        const propertyValue = this.fileData?.frontMatterCache?.[propertyName] || "";
        if (!propertyValue) {
            return [];
        }
        if (!Array.isArray(propertyValue)) {
            return propertyValue.path ? [propertyValue.path] : [];
        }
        return propertyValue
            .filter((item: any) => item?.path)
            .map( (item: any) => {
                if (pathAliases && item.display) {
                    if (!pathAliases[item.path]) {
                        pathAliases[item.path] = [];
                    }
                    pathAliases[item.path].push(item.display)
                }
                return item.path
            })
    }

    readInlinkedRelationshipPropertyPaths(
        propertyName: string,
    ): string[] {
        return this.readInlinkedPropertyPathsFromVault(propertyName);
    }
    readInlinkedPropertyPathsFromVault(
        propertyName: string,
    ): string[] {
        let complementaryRelationshipPropertyPaths: string[] = [];
        let fileRecords = this.dataService.vaultFileRecords;
        // if (!fileRecords || fileRecords.length === 0) {
        //     fileRecords = this.dataService.refresh();
        // }
        // let fileRecords = this.dataService.dataviewApi.pages().array()
        fileRecords
            .forEach( (fileNodeRecords: FileNodeDataRecords) => {
                const fileNodePropertyValues = fileNodeRecords?.frontMatterCache[propertyName];
                if (fileNodePropertyValues && Array.isArray(fileNodePropertyValues)) {
                    fileNodePropertyValues.forEach( (pagePropertyItem: FileNodeDataType) => {
                        if (pagePropertyItem && pagePropertyItem.path === this.filePath) {
                            let subscriberFilePath: string = fileNodeRecords.file?.path
                            if (subscriberFilePath) {
                                // if (!this.pathFilter || !this.pathFilter.excludedPathPatternSet.has(subscriberFilePath)) {
                                // Convention is that link aliases reflect what the target node is to the in-linking node.
                                // We use the display text when linking out, but when linking in it would incorrectly apply to
                                // to the inlinking node
                                // let displayText: string = pagePropertyItem.display
                                let displayText = "";
                                complementaryRelationshipPropertyPaths.push( subscriberFilePath )
                                // }
                            }
                        }
                    })
                }
            })
        return complementaryRelationshipPropertyPaths
    }

    _processPropertyLinkResults(
        key: string,
        newElements: FilePathType[],
        linkedNotesystemPaths: FilePathType[],
        relationshipData: RelationshipLinkedPathDataType,
    ) {
        if (!newElements || newElements.length === 0) {
            return;
        }
        newElements.forEach( (filePath: FilePathType) => {
            this.registerRelationship(filePath, relationshipData);
            linkedNotesystemPaths.push(filePath);
        });
    }

    parsePropertyLinkedPaths(
        primaryRelationshipKey: string,
        inlinkedRelationshipKey: string,
        filePathNodeMap: FilePathNodeMapType,
        pathAliases: PathAliasesMapType,
        isInvertLinkPolarity: boolean = false,
    ): FilePathType[] {

        let linkedNotesystemPaths: FilePathType[] = [];
        if (primaryRelationshipKey) {
            let outlinkedPaths: string[] = this.readDesignatedPropertyPaths(
                primaryRelationshipKey,
                pathAliases,
            );
            this._processPropertyLinkResults(
                primaryRelationshipKey,
                outlinkedPaths,
                linkedNotesystemPaths,
                {
                    // Are new elements inlinks to the current note;?
                    // They are if they used an outlink to connect to the note
                    relationshipKey: primaryRelationshipKey,
                    isInlink: isInvertLinkPolarity ? true : false,
                },
                // isInvertLinkPolarity ? true : false, // are new elements inlinks?
            );
        }
        if (inlinkedRelationshipKey) {
            let inlinkedPaths: string[] = this.readInlinkedRelationshipPropertyPaths(inlinkedRelationshipKey);
            this._processPropertyLinkResults(
                inlinkedRelationshipKey,
                inlinkedPaths,
                linkedNotesystemPaths,
                {
                    relationshipKey: inlinkedRelationshipKey,
                    isInlink: isInvertLinkPolarity ? false : true, // are new elements inlinks?
                },
                // isInvertLinkPolarity ? false : true, // are new elements inlinks?
            );
        }
        return [ ... new Set<FilePathType>(linkedNotesystemPaths)];
    }

    @Cacheable("label", "relationshipDefinitions", "limitHeight")
    superordinateChains(
        label: string,
        relationshipDefinitions: RelationshipDefinition[],
        limitHeight: number | null,
        filePathNodeMap: FilePathNodeMapType,
    ): SuperordinateChains {
        if (this._superordinateChains === undefined) {
            let results: SuperordinateChains = {
                rootNodes: [],
                leafNodes: [],
            };
            if (limitHeight != null && limitHeight < 0) {
                return results;
            }
            relationshipDefinitions.forEach( (relationshipDefinition: RelationshipDefinition) => {
                let primaryRelationshipKey: string = relationshipDefinition.primaryRelationshipPropertyName || "";
                let complementaryRelationshipKey: string = relationshipDefinition.complementaryRelationshipPropertyName || "";
                let pathAliases: PathAliasesMapType = {};
                let linkedNotesystemPaths = this.parsePropertyLinkedPaths(
                    primaryRelationshipKey,
                    complementaryRelationshipKey,
                    filePathNodeMap,
                    pathAliases,
                    false,
                );
                linkedNotesystemPaths.forEach( (propertyLinkedPath: string) => {
                    if (propertyLinkedPath === this.filePath) {
                    } else {
                        let connectedSuperordinateChains: SuperordinateChains;
                        let linkedNoteSystemNode = filePathNodeMap.get(propertyLinkedPath);
                        if (linkedNoteSystemNode === undefined) {
                            linkedNoteSystemNode = this.createNew(propertyLinkedPath, pathAliases[propertyLinkedPath] ? pathAliases[propertyLinkedPath][0] : undefined);
                            filePathNodeMap.set(propertyLinkedPath, linkedNoteSystemNode);
                            connectedSuperordinateChains = linkedNoteSystemNode.superordinateChains(
                                label,
                                relationshipDefinitions,
                                limitHeight === null ? null : limitHeight -1,
                                filePathNodeMap,
                            );
                            linkedNoteSystemNode._superordinateChains = connectedSuperordinateChains;
                        } else {
                            connectedSuperordinateChains = linkedNoteSystemNode._superordinateChains;
                        }
                        if (!connectedSuperordinateChains) {
                            return; // hasn't been created yet but has been looped around
                        }
                        connectedSuperordinateChains.rootNodes.forEach( (chain: FileNavigationTreeNode) => {
                            results.rootNodes.push(chain);
                        });
                        connectedSuperordinateChains.leafNodes.forEach( (chain: FileNavigationTreeNode) => {
                            let newLeaf = chain.ensureChildValue(this);
                            results.leafNodes.push(newLeaf);
                        });
                    }
                });
            });
            if (results.rootNodes.length === 0 || results.leafNodes.length === 0) {
                // let fileNavigationTreeNode = new FileNavigationTreeNode();
                // let fileNavigationTreeNode = new TreeNode<FileNode>(this);
                let fileNavigationTreeNode = this.createNewFileNavigationTreeNode()
                results.rootNodes.push(fileNavigationTreeNode);
                results.leafNodes.push(fileNavigationTreeNode);
            }
            // return results; // this works, but duplicates the entire hierarchy for any duplicate instead of merging
            results.rootNodes = [ ... new Set<FileNavigationTreeNode>(results.rootNodes) ];
            results.leafNodes = [ ... new Set<FileNavigationTreeNode>(results.leafNodes) ];
            this._superordinateChains = results;
        }
        return this._superordinateChains;
    }

    @Cacheable("label", "relationshipDefinitions")
    subordinateSubtrees(
        label: string,
        relationshipDefinitions: RelationshipDefinition[],
        limitDepth: number | null = null,
        filePathNodeMap: FilePathNodeMapType,
    ): FileNavigationTreeNode {
        // let subtreeRoot = new TreeNode<FileNode>(this);
        let subtreeRoot = this.createNewFileNavigationTreeNode();
        if (limitDepth != null && limitDepth < 0) {
            return subtreeRoot;
        }
        relationshipDefinitions.forEach( (relationshipDefinition: RelationshipDefinition) => {
            // Inverted relationship: inlinked notes are establishing a superordinate relationship;
            // but from the focal note's perspective, the relationship is subordinate
            let invertedInvertedRelationshipKey: string = relationshipDefinition.complementaryRelationshipPropertyName || "";
            let invertedDesignatedRelationshipKey: string = relationshipDefinition.primaryRelationshipPropertyName || "";
            let pathAliases: PathAliasesMapType = {};
            let linkedNotesystemPaths = this.parsePropertyLinkedPaths(
                invertedInvertedRelationshipKey,
                invertedDesignatedRelationshipKey,
                filePathNodeMap,
                pathAliases,
                true,
            );
            let subordinateFilePaths: { [filePath: string]: FileNavigationTreeNode } = {};
            linkedNotesystemPaths.forEach( (propertyLinkedPath: string) => {
                if (propertyLinkedPath === this.filePath) {
                    let linkedNoteSystemNode = this;
                    filePathNodeMap.set(propertyLinkedPath, linkedNoteSystemNode);
                    let treeChildNode: FileNavigationTreeNode = linkedNoteSystemNode.subordinateSubtrees(
                        label,
                        relationshipDefinitions,
                        -1, // will return terminal
                        filePathNodeMap,
                    );
                    subordinateFilePaths[propertyLinkedPath] = subtreeRoot.addChildNode(treeChildNode);
                } else if (subordinateFilePaths[propertyLinkedPath]) {
                    // already in child set
                } else {
                    let recurseLimitDepth: number | null = limitDepth === null ? null : limitDepth -1;
                    // has a node for this path been built yet?
                    let linkedNoteSystemNode = filePathNodeMap.get(propertyLinkedPath);
                    if (linkedNoteSystemNode === undefined) {
                        // no: build new subordinate
                        // linkedNoteSystemNode = this.createNew(propertyLinkedPath);
                        linkedNoteSystemNode = this.createNew(propertyLinkedPath, pathAliases[propertyLinkedPath] ? pathAliases[propertyLinkedPath][0] : undefined);
                    } else {
                        // yes: we do not wanto to explore further down this subtree's children;
                        // - We *could*, recursive loops are trapped, but this seems a bit too much
                        //   information at too much expense as, presumably, the
                        //   children are expanded elsewhere in the view.
                        recurseLimitDepth = -1;
                    }
                    filePathNodeMap.set(propertyLinkedPath, linkedNoteSystemNode);
                    let treeChildNode: FileNavigationTreeNode = linkedNoteSystemNode.subordinateSubtrees(
                        label,
                        relationshipDefinitions,
                        recurseLimitDepth,
                        filePathNodeMap,
                    );
                    subordinateFilePaths[propertyLinkedPath] = subtreeRoot.addChildNode(treeChildNode);

                }
            });
        });
        return subtreeRoot;
    }

    @Cacheable("label", "relationshipDefinitions")
    coordinateSubtrees(
        label: string,
        relationshipDefinitions: RelationshipDefinition[],
        secondaryRelationshipDefinitions: RelationshipDefinition[],
        limitDepth: number | null = null,
        filePathNodeMap: FilePathNodeMapType,
    ): FileNavigationTreeNode {
        // let subtreeRoot = new TreeNode<FileNode>(this);
        let subtreeRoot = this.createNewFileNavigationTreeNode();
        if (limitDepth != null && limitDepth < 0) {
            return subtreeRoot;
        }
        let coordinateFilePaths: { [filePath: string]: FileNavigationTreeNode } = {};
        relationshipDefinitions.forEach( (relationshipDefinition: RelationshipDefinition) => {
            let primaryRelationshipKey: string = relationshipDefinition.primaryRelationshipPropertyName || "";
            // let complementaryRelationshipKey: string = relationshipDefinition.complementaryRelationshipPropertyName || "";
            let inlinkedRelationshipKey: string = primaryRelationshipKey;
            // let complementaryRelationshipKey: string = "";
            let pathAliases: PathAliasesMapType = {};
            let linkedNotesystemPaths = this.parsePropertyLinkedPaths(
                primaryRelationshipKey,
                inlinkedRelationshipKey,
                filePathNodeMap,
                pathAliases,
                true,
            );
            linkedNotesystemPaths.forEach( (propertyLinkedPath: string) => {
                if (propertyLinkedPath === this.filePath) {
                    let linkedNoteSystemNode = this;
                    filePathNodeMap.set(propertyLinkedPath, linkedNoteSystemNode);

                    // Expand coordinates
                    if (false) {
                        let treeChildNode: FileNavigationTreeNode = linkedNoteSystemNode.coordinateSubtrees(
                            label,
                            relationshipDefinitions,
                            secondaryRelationshipDefinitions,
                            -1, // will return terminal
                            filePathNodeMap,
                        );
                        coordinateFilePaths[propertyLinkedPath] = subtreeRoot.addChildNode(treeChildNode);
                    }
                    if (true) {
                        let treeChildNode: FileNavigationTreeNode = linkedNoteSystemNode.subordinateSubtrees(
                            label,
                            secondaryRelationshipDefinitions,
                            -1, // will return terminal
                            filePathNodeMap,
                        );
                        coordinateFilePaths[propertyLinkedPath] = subtreeRoot.addChildNode(treeChildNode);
                    }
                    // // Expand children
                    // let treeChildNode: FileNavigationTreeNode = linkedNoteSystemNode.subordinateSubtrees(
                    //     label,
                    //     relationshipDefinitions,
                    //     -1, // will return terminal
                    //     filePathNodeMap,
                    // );
                } else if (coordinateFilePaths[propertyLinkedPath]) {
                    // already in child set
                } else {
                    let recurseLimitDepth: number | null = limitDepth === null ? null : limitDepth -1;
                    // has a node for this path been built yet?
                    let linkedNoteSystemNode = filePathNodeMap.get(propertyLinkedPath);
                    if (linkedNoteSystemNode === undefined) {
                        // no: build new subordinate
                        // linkedNoteSystemNode = this.createNew(propertyLinkedPath);
                        linkedNoteSystemNode = this.createNew(propertyLinkedPath, pathAliases[propertyLinkedPath] ? pathAliases[propertyLinkedPath][0] : undefined);
                    } else {
                        recurseLimitDepth = -1;
                    }
                    filePathNodeMap.set(propertyLinkedPath, linkedNoteSystemNode);
                    // if (false) {
                    //     let treeChildNode: FileNavigationTreeNode = linkedNoteSystemNode.coordinateSubtrees(
                    //         label,
                    //         relationshipDefinitions,
                    //         secondaryRelationshipDefinitions,
                    //         recurseLimitDepth,
                    //         filePathNodeMap,
                    //     );
                    //     coordinateFilePaths[propertyLinkedPath] = subtreeRoot.addChildNode(treeChildNode);
                    // }
                    if (true) {
                        let treeChildNode: FileNavigationTreeNode = linkedNoteSystemNode.subordinateSubtrees(
                            label,
                            secondaryRelationshipDefinitions,
                            recurseLimitDepth,
                            filePathNodeMap,
                        );
                        coordinateFilePaths[propertyLinkedPath] = subtreeRoot.addChildNode(treeChildNode);
                    }

                }
            });
        });
        return subtreeRoot;
    }

    @Cacheable("propertyNames")
    readGlyphs(
        propertyNames: string[],
        limitDepth: number | null = null,
    ): string[] {
        let nodeGlyphs: string[] = [];
        if (limitDepth != null && limitDepth < 0) {
            return nodeGlyphs;
        }
        this.dataService.glyphFilePathNodeMap.set(this.filePath, this);
        propertyNames.forEach( (propertyKey: string) => {
                (this.fileData?.frontMatterCache?.[propertyKey] || [])
                .forEach( (fieldValue: FileNodeDataType) => {
                    if (fieldValue.path !== undefined) {
                        let referencedGlyphPath = fieldValue.path;
                        let recurseLimitDepth: number | null = limitDepth === null ? null : limitDepth -1;
                        let referencedGlyphNode = this.dataService.glyphFilePathNodeMap.get(referencedGlyphPath);
                        if (referencedGlyphNode === undefined) {
                            referencedGlyphNode = this.createNew(referencedGlyphPath, undefined);
                            this.dataService.glyphFilePathNodeMap.set(referencedGlyphPath, referencedGlyphNode);
                            nodeGlyphs.push(... referencedGlyphNode.readGlyphs(propertyNames, recurseLimitDepth));
                        } else {
                            recurseLimitDepth = -1;
                        }
                    } else {
                        nodeGlyphs.push(fieldValue.toString());
                    }
                });
        });
        return nodeGlyphs;
    }

    readPropertyStringList(key: string,): string[] {
        const propertyValue = this.fileData?.frontMatterCache?.[key] || ""
        if (!propertyValue) {
            return [];
        }
        if (Array.isArray(propertyValue)) {
            return propertyValue;
        } else {
            return [propertyValue.toString()];
        }
    }

    inlinkedFilePaths(): string[] {
        const inlinks: Link[] = this.fileData?.file?.inlinks || [];
        return inlinks.map( (link: Link) => link.path );
    }

    backlinkedFileNodes(): FileNode[] {
        // const file = app.vault.getAbstractFileByPath(this.fileData?.file?.path);
        // let backlinks = app.metadataCache.getBacklinksForFile(file);
        // let backlinks = app.metadataCache.getBacklinksForFile(file);
        // Only markdown files; needs dataview
        const inlinks: Link[] = this.fileData?.file?.inlinks?.array() || [];
        return inlinks
            .filter( (link: Link) => link.path && link.path != this.filePath )
            .map( (link: Link) => this.createNew(link.path, link.display) );
    }

    get indexEntryText(): string {
        let isIncludePrefix: boolean = true;
        let dt = (
                this.displayText
                || getFrontMatterDisplayTitle(
                    this.dataService.configuration,
                    this.fileData?.frontMatterCache,
                    isIncludePrefix,
                    this.fileBaseName,
                    )
            )
            .trim();
        return dt;
        // return this._memoize( "indexEntry", () => {
        //     let dt = (
        //             this.displayText
        //             || getFrontMatterDisplayTitle(
        //                 this.dataService.configuration,
        //                 this.fileData?.frontMatterCache,
        //                 this.fileBaseName,
        //                 )
        //             || this.filePath
        //             || "(?)"
        //         )
        //         .trim();
        //     return dt;
        // });
    }
    get indexEntryTextWithoutPrefix(): string {
        let isIncludePrefix: boolean = false;
        let dt = (
                this.displayText
                || getFrontMatterDisplayTitle(
                    this.dataService.configuration,
                    this.fileData?.frontMatterCache,
                    isIncludePrefix,
                    this.fileBaseName,
                    )
            )
            .trim();
        return dt;
    }

    sort_key(other: FileNode): number {
        const a: string = this.indexEntryText || this.fileBaseName || ""
        const b: string = other.indexEntryText || other.fileBaseName || ""
        const result = a.localeCompare(b)
        return result
    }

}

