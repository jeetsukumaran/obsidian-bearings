import {
    Notice,
    App,
} from 'obsidian';

import {
   RelationshipDefinition,
} from "./settings";

import * as _path from "path"
let getFileBaseName = ( (value: string) => _path.parse(value).base )

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
export type DataviewPage = Record<string, Literal>; // aka Dataview "page"
export type FileNodeDataRecords = DataviewPage;
export type FileNodeDataType = Literal;


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

function Cacheable(...keyParams: string[]) {
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

// }
export type FileNavigationTreeNode = TreeNode<FileNode>;

export type SuperordinateChains = {
    rootNodes: FileNavigationTreeNode[];
    leafNodes: FileNavigationTreeNode[];
}

export type RelationshipLinkedPathDataType = {
    isInlink: boolean,
};
export type FilePathNodeMapType = Map<FilePathType, FileNode>;


export class DataService {
    _dataviewApi: DataviewApi;
    _vaultFileRecords: FileNodeDataRecords[] = [];
    _isDataviewUnavailableMessageSent: boolean = false;

    constructor() {
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

    readFileNodeDataRecords(filePath: string): FileNodeDataRecords | undefined {
        return this.dataviewApi?.page(filePath)
    }

    refresh(): FileNodeDataRecords[] {
        this._vaultFileRecords = this.dataviewApi?.pages()?.array() || [];
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
        );
    }

    coordinateSubtrees(
        filePath: string,
        relationshipDefinitions: RelationshipDefinition[],
        limitDepth: number | null = null,
        filePathNodeMap?: FilePathNodeMapType,
    ): FileNavigationTreeNode {
        if (!filePathNodeMap) {
            filePathNodeMap = new Map<FilePathType, FileNode>();
        }
        let startFileNode = filePathNodeMap.get(filePath) || this.getFileNode(filePath);
        // filePathNodeMap.set(filePath, startFileNode) // not tested
        return startFileNode.coordinateSubtrees(
            "standard",
            relationshipDefinitions,
            limitDepth,
            filePathNodeMap,
        );
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
    fileData: FileNodeDataRecords;
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
        this.fileData = this.dataService.readFileNodeDataRecords(filePath) || {};
        this.displayText = displayText;
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
        pathAliases?: { [filePath: string]: string},
    ): string[] {
        const propertyValue = this.fileData[propertyName] || "";
        if (!propertyValue) {
            return [];
        }
        if (!Array.isArray(propertyValue)) {
            return propertyValue.path ? [propertyValue.path] : [];
        }
        return propertyValue
            .filter((item: any) => item?.path)
            .map( (item: any) => {
                if (pathAliases) {
                    pathAliases[item.path] = item.display || "";
                }
                return item.path
            })
    }

    readInvertedRelationshipPropertyPaths(
        propertyName: string,
    ): string[] {
        return this.readInvertedRelationshipPropertyPathsFromVault(propertyName);
    }

    readInvertedRelationshipPropertyPathsFromInlinks(
        propertyName: string,
    ): string[] {
        // slower than a vault wide search strangely ...
        let invertedRelationshipPropertyPaths: string[] = [];
        this.inlinkedFilePaths().map( (filePath: string) => this.dataService.readFileNodeDataRecords(filePath) )
            .forEach( (fileNodeRecords: FileNodeDataRecords) => {
                const fileNodePropertyValues = fileNodeRecords?.[propertyName];
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
                                invertedRelationshipPropertyPaths.push( subscriberFilePath )
                                // }
                            }
                        }
                    })
                }
            })
        return invertedRelationshipPropertyPaths
    }

    readInvertedRelationshipPropertyPathsFromVault(
        propertyName: string,
    ): string[] {
        let invertedRelationshipPropertyPaths: string[] = [];
        let fileRecords = this.dataService.vaultFileRecords;
        // if (!fileRecords || fileRecords.length === 0) {
        //     fileRecords = this.dataService.refresh();
        // }
        // let fileRecords = this.dataService.dataviewApi.pages().array()
        fileRecords
            .forEach( (fileNodeRecords: FileNodeDataRecords) => {
                const fileNodePropertyValues = fileNodeRecords?.[propertyName];
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
                                invertedRelationshipPropertyPaths.push( subscriberFilePath )
                                // }
                            }
                        }
                    })
                }
            })
        return invertedRelationshipPropertyPaths
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
        designatedRelationshipKey: string,
        invertedRelationshipKey: string,
        filePathNodeMap: FilePathNodeMapType,
        isInvertLinkPolarity: boolean = false,
    ): FilePathType[] {

        let linkedNotesystemPaths: FilePathType[] = [];
        if (designatedRelationshipKey) {
            let pathAliases: { [filePath: string]: string } = {};
            let outlinkedPaths: string[] = this.readDesignatedPropertyPaths(
                designatedRelationshipKey,
                pathAliases,
            );
            this._processPropertyLinkResults(
                designatedRelationshipKey,
                outlinkedPaths,
                linkedNotesystemPaths,
                {
                    // Are new elements inlinks to the current note;?
                    // They are if they used an outlink to connect to the note
                    isInlink: isInvertLinkPolarity ? true : false,
                },
                // isInvertLinkPolarity ? true : false, // are new elements inlinks?
            );
        }
        if (invertedRelationshipKey) {
            let inlinkedPaths: string[] = this.readInvertedRelationshipPropertyPaths(invertedRelationshipKey);
            this._processPropertyLinkResults(
                invertedRelationshipKey,
                inlinkedPaths,
                linkedNotesystemPaths,
                {
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
                let designatedRelationshipKey: string = relationshipDefinition.designatedPropertyName || "";
                let invertedRelationshipKey: string = relationshipDefinition.invertedRelationshipPropertyName || "";
                let linkedNotesystemPaths = this.parsePropertyLinkedPaths(
                    designatedRelationshipKey,
                    invertedRelationshipKey,
                    filePathNodeMap,
                    false,
                );
                linkedNotesystemPaths.forEach( (propertyLinkedPath: string) => {
                    if (propertyLinkedPath === this.filePath) {
                    } else {
                        let connectedSuperordinateChains: SuperordinateChains;
                        let linkedNoteSystemNode = filePathNodeMap.get(propertyLinkedPath);
                        if (linkedNoteSystemNode === undefined) {
                            linkedNoteSystemNode = this.createNew(propertyLinkedPath);
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
                let fileNavigationTreeNode = new TreeNode<FileNode>(this);
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
        let subtreeRoot = new TreeNode<FileNode>(this);
        if (limitDepth != null && limitDepth < 0) {
            return subtreeRoot;
        }
        relationshipDefinitions.forEach( (relationshipDefinition: RelationshipDefinition) => {
            // Inverted relationship: inlinked notes are establishing a superordinate relationship;
            // but from the focal note's perspective, the relationship is subordinate
            let invertedInvertedRelationshipKey: string = relationshipDefinition.invertedRelationshipPropertyName || "";
            let invertedDesignatedRelationshipKey: string = relationshipDefinition.designatedPropertyName || "";
            let linkedNotesystemPaths = this.parsePropertyLinkedPaths(
                invertedInvertedRelationshipKey,
                invertedDesignatedRelationshipKey,
                filePathNodeMap,
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
                    // console.log(subordinateFilePaths[propertyLinkedPath]);
                } else {
                    let recurseLimitDepth: number | null = limitDepth === null ? null : limitDepth -1;
                    // has a node for this path been built yet?
                    let linkedNoteSystemNode = filePathNodeMap.get(propertyLinkedPath);
                    if (linkedNoteSystemNode === undefined) {
                        // no: build new subordinate
                        linkedNoteSystemNode = this.createNew(propertyLinkedPath);
                    } else {
                        // yes: we do not wanto to explore further down this subtree's children;
                        // - We *could*, recursive loops are trapped, but this seems a bit too much
                        //   information at too much expense as, presumably, the
                        //   children are expanded elsewhere in the view.
                        recurseLimitDepth = 0;
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
        limitDepth: number | null = null,
        filePathNodeMap: FilePathNodeMapType,
    ): FileNavigationTreeNode {
        let subtreeRoot = new TreeNode<FileNode>(this);
        if (limitDepth != null && limitDepth < 0) {
            return subtreeRoot;
        }
        relationshipDefinitions.forEach( (relationshipDefinition: RelationshipDefinition) => {
            // Inverted relationship: inlinked notes are establishing a superordinate relationship;
            // but from the focal note's perspective, the relationship is subordinate
            let designatedRelationshipKey: string = relationshipDefinition.designatedPropertyName || "";
            // let invertedRelationshipKey: string = relationshipDefinition.invertedRelationshipPropertyName || "";
            let invertedRelationshipKey: string = "";
            let linkedNotesystemPaths = this.parsePropertyLinkedPaths(
                designatedRelationshipKey,
                invertedRelationshipKey,
                filePathNodeMap,
                false,
            );
            let coordinateFilePaths: { [filePath: string]: FileNavigationTreeNode } = {};
            linkedNotesystemPaths.forEach( (propertyLinkedPath: string) => {
                if (propertyLinkedPath === this.filePath) {
                    let linkedNoteSystemNode = this;
                    filePathNodeMap.set(propertyLinkedPath, linkedNoteSystemNode);

                    // Expand coordinates
                    let treeChildNode: FileNavigationTreeNode = linkedNoteSystemNode.coordinateSubtrees(
                        label,
                        relationshipDefinitions,
                        -1, // will return terminal
                        filePathNodeMap,
                    );
                    coordinateFilePaths[propertyLinkedPath] = subtreeRoot.addChildNode(treeChildNode);
                    // // Expand children
                    // let treeChildNode: FileNavigationTreeNode = linkedNoteSystemNode.subordinateSubtrees(
                    //     label,
                    //     relationshipDefinitions,
                    //     -1, // will return terminal
                    //     filePathNodeMap,
                    // );
                } else if (coordinateFilePaths[propertyLinkedPath]) {
                    // already in child set
                    // console.log(coordinateFilePaths[propertyLinkedPath]);
                } else {
                    let recurseLimitDepth: number | null = limitDepth === null ? null : limitDepth -1;
                    // has a node for this path been built yet?
                    let linkedNoteSystemNode = filePathNodeMap.get(propertyLinkedPath);
                    if (linkedNoteSystemNode === undefined) {
                        // no: build new subordinate
                        linkedNoteSystemNode = this.createNew(propertyLinkedPath);
                    } else {
                        recurseLimitDepth = 0;
                    }
                    filePathNodeMap.set(propertyLinkedPath, linkedNoteSystemNode);
                    let treeChildNode: FileNavigationTreeNode = linkedNoteSystemNode.coordinateSubtrees(
                        label,
                        relationshipDefinitions,
                        recurseLimitDepth,
                        filePathNodeMap,
                    );
                    coordinateFilePaths[propertyLinkedPath] = subtreeRoot.addChildNode(treeChildNode);

                }
            });
        });
        return subtreeRoot;
    }

    readPropertyStringList(key: string,): string[] {
        const propertyValue = this.fileData[key] || ""
        if (!propertyValue) {
            return [];
        }
        if (Array.isArray(propertyValue)) {
            return propertyValue;
        } else {
            return [propertyValue.toString()];
        }
    }

    propertyLinks(propertyName: string,): FileNode[] {
        // const pagePropertyValue = this.page?.[propertyName];
        const pagePropertyValue = this.fileData[propertyName]
        if (!pagePropertyValue) {
            return [];
        }
        if (Array.isArray(pagePropertyValue)) {
            return pagePropertyValue
                .filter( (value: FileNodeDataType) => value && value.path )
                .map( (value: FileNodeDataType) => {
                    if (value.path === this.filePath) {
                        return this;
                    } else {
                        return this.newFileNode(value.path, value.display);
                    }
                });
        } else {
            return [];
        }
    }

    newFileNode(
        filePath: string,
        displayText: string | null,
    ) {
        return new FileNode(
            filePath,
            this.dataService,
            displayText,
        )
    }

    inlinkedFilePaths(): string[] {
        const inlinks: Link[] = this.fileData?.file?.inlinks || [];
        return inlinks.map( (link: Link) => link.path );
    }

    backlinkedFileNodes(): FileNode[] {
        // const file = app.vault.getAbstractFileByPath(this.fileData?.file?.path);
        // console.log(this.fileData);
        // let backlinks = app.metadataCache.getBacklinksForFile(file);
        // let backlinks = app.metadataCache.getBacklinksForFile(file);
        // console.log(backlinks);
        // Only markdown files; needs dataview
        const inlinks: Link[] = this.fileData?.file?.inlinks?.array() || [];
        return inlinks
            .filter( (link: Link) => link.path && link.path != this.filePath )
            .map( (link: Link) => this.newFileNode(link.path, link.display) );
    }

    get indexEntryText(): string {
        return this._memoize(
          "indexEntry",
          () => String(this.displayText
            || this.fileData["entry-title"]
            || this.fileData["title"]
            || this.fileBaseName
            || this.filePath
            || "(?)")
            .trim()
          );
    }

    sort_key(other: FileNode): number {
        const a: string = this.indexEntryText || this.fileBaseName || ""
        const b: string = other.indexEntryText || other.fileBaseName || ""
        const result = a.localeCompare(b)
        return result
    }

}

