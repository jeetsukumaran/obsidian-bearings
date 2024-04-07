export class TreeNode<T> {
    private static _counter = 0;
    private _id: string = "";
    private _children: TreeNode<T>[];
    private _descendantNodeCount: number | null = null; // Cache for the number of descendant nodes.
    private _leafCount: number | null = null;  // Cache for the number of leaves.
    public value: T;

    constructor(value: T) {
        this.value = value;
        this._children = [];
    }

    public get id(): string {
        if (!this._id) {
            this._id = `v${TreeNode._counter++}`;
        }
        return this._id;
    }

    public resetId(): string {
        this._id = "";
        return this.id;
    }

    public get children(): readonly TreeNode<T>[] {
        return this._children;
    }

    public set children(newChildren: readonly TreeNode<T>[])  {
        this._children = [ ... newChildren];
    }

    // Applies a function to this node's value.
    public applyToValue(func: (value: T) => T): void {
        this.value = func(this.value);
    }

    // Applies a function to this node.
    public applyToNode(func: (node: TreeNode<T>) => void): void {
        func(this);
    }

    public addChildNode(childNode: TreeNode<T>): TreeNode<T> {
        this._children.push(childNode);
        this._descendantNodeCount = null;
        return childNode;
    }

    public newChild(value: T): TreeNode<T> {
        const childNode = new TreeNode(value);
        this._children.push(childNode);
        this._descendantNodeCount = null;
        return childNode;
    }

    public findChildValue(value: T): TreeNode<T> | null {
        this.children.forEach( (childNode: TreeNode<T>) => {
            if (childNode.value === value) {
                return childNode;
            }
        });
        return null;
    }

    public ensureChildValue(value: T): TreeNode<T> {
        let rval = this.findChildValue(value) ;
        if (rval === null) {
            return this.newChild(value);
        } else {
            return rval;
        }
    }

    public hasChildValue(value: T): boolean {
        return this.children.some( (ch: TreeNode<T>) => {
            return ch.value === value;
        });
    }


    public forEach(callback: (node: TreeNode<T>) => void, order: 'preorder' | 'postorder' = 'preorder'): void {
        const iterator = order === 'preorder' ? this.preorderTraversal() : this.postorderTraversal();
        for (const node of iterator) {
            callback(node);
        }
    }

    public *preorderTraversal(): Generator<TreeNode<T>> {
        yield this;  // Yield current node
        for (const child of this._children) {
            yield* child.preorderTraversal();
        }
    }

    // Postorder traversal: process children, then node.
    public *postorderTraversal(): Generator<TreeNode<T>> {
        for (const child of this._children) {
            yield* child.postorderTraversal();
        }
        yield this;  // Yield current node
    }

    public get leafCount(): number {
        if (this._leafCount === null) { // Check if count is not already cached
            this._leafCount = this.computeLeafCount();
        }
        return this._leafCount;
    }

    private computeLeafCount(): number {
        if (this._children.length === 0) {
            return 1; // This node is a leaf
        }
        return this._children.reduce((acc, child) => acc + child.leafCount, 0); // Sum of all child leaves
    }

    public get descendantNodeCount(): number {
        if (this._descendantNodeCount === null) { // Check if count is not already cached
            this._descendantNodeCount = this.computeDescendantNodeCount();
        }
        return this._descendantNodeCount;
    }

    private computeDescendantNodeCount(): number {
        // Sum the descendant counts of all children, plus one for the current node itself.
        return 1 + this._children.reduce((acc, child) => acc + child.descendantNodeCount, 0);
    }

}

//// Based on:
////
//// https://github.com/dtjv/blog-demos/blob/main/the-generic-tree-value-structure/LICENSE
////
//// https://dtjv.io/the-generic-tree-value-structure/
////

//// import { isEqual } from 'lodash'

//interface TreeNode<T> {
//  value: T
//  children: Tree<T>[]
//}

//export enum Traversals {
//  PRE_ORDER,
//  POST_ORDER,
//  LEVEL_ORDER,
//}

//export class Tree<T> {
//  private static _counter = 0;
//  private _id: string = "";
//  private _root: TreeNode<T> | undefined = undefined

//    public get id(): string {
//        if (!this._id) {
//            this._id = `V${Tree._counter++}`;
//        }
//        return this._id;
//    }

//    public resetId(): string {
//        this._id = "";
//        return this._id;
//    }

//    public insert(value: T): Tree<T> {
//        if (!this._root) {
//            this._root = {
//                value,
//                children: [],
//            }
//            return this;
//        }
//            const child = new Tree<T>();
//            this._root.children.push(child.insert(value));
//            return child;
//    }

//    public get children(): readonly Tree<T>[] {
//        return this._root?.children || [];
//    }

//    public get value(): T | undefined {
//        return this._root?.value;
//    }

//    public findChildValue(value: T): Tree<T> | null {
//        if (!this._root) {
//            return null;
//        }
//        this.children.forEach( (childNode: Tree<T>) => {
//            if (childNode.value === value) {
//                return childNode;
//            }
//        });
//        return null;
//    }

//    public ensureChildValue(value: T): Tree<T> {
//        let rval = this.findChildValue(value) ;
//        if (rval === null) {
//            return this.insert(value);
//        } else {
//            return rval;
//        }
//    }


//    public hasChildValue(value: T): boolean {
//        if (!this._root) {
//            return false;
//        }
//        return this.children.some( (ch: Tree<T>) => {
//            return ch._root?.value === value;
//        });
//    }

//  // public remove(value: T): void {
//  //   if (!this.root) return

//  //   if (isEqual(this.root.value, value)) {
//  //     this.root = undefined
//  //     return
//  //   }

//  //   this.root.children = this.root.children.filter(
//  //     (child) => !isEqual(child.root?.value, value)
//  //   )
//  //   this.root.children.forEach((child) => child.remove(value))
//  // }

//    /**
//     * Returns the longest path from `tree` node to a leaf node.
//     */
//    public height(tree: Tree<T>): number {
//        if (!tree._root) return -1

//            return tree._root.children.length === 0
//                ? 0
//                : Math.max(...tree._root.children.map((child) => 1 + child.height(child)))
//    }

//    /*
//     * Returns the path length from this tree's root node to `target` node.
//     */
//    public depth(target: Tree<T>): number {
//        const queue = [{ tree: this as Tree<T>, level: 0 }]

//        while (queue.length) {
//            const entry = queue.pop()

//            if (entry && entry.tree._root === target._root) {
//                return entry.level
//            }

//            entry?.tree?._root?.children.forEach((child) => {
//                queue.unshift({ tree: child, level: entry.level + 1 })
//            })
//        }

//        return -1
//    }

//    public toArray(traversal: Traversals = Traversals.LEVEL_ORDER): T[] {
//        switch (traversal) {
//            case Traversals.PRE_ORDER:
//                return this.traversePreOrder(this._root)
//            case Traversals.POST_ORDER:
//                return this.traversePostOrder(this._root)
//            default:
//                return this.traverseLevelOrder(this._root)
//        }
//    }

//    public toNodeArray(traversal: Traversals = Traversals.LEVEL_ORDER): Tree<T>[] {
//        return this.traversePostOrderNodes(this._root)
//    }

//    private traversePreOrder(root: TreeNode<T> | undefined): T[] {
//        if (!root) return [];
//        return [
//            root.value,
//            ...root.children.flatMap((child) => child.traversePreOrder(child._root)),
//        ]
//    }

//    private traversePostOrder(root: TreeNode<T> | undefined): T[] {
//        if (!root) return []

//            return [
//                ...root.children.flatMap((child) => child.traversePostOrder(child._root)),
//                    root.value,
//            ]
//    }

//    private traverseLevelOrder(root: TreeNode<T> | undefined): T[] {
//        const result: T[] = []
//        const queue: (TreeNode<T> | undefined)[] = [root]

//        while (queue.length) {
//            const node = queue.pop()

//            if (node) {
//                result.push(node.value)

//                for (const child of node.children) {
//                    queue.unshift(child._root)
//                }
//            }
//        }

//        return result
//    }
//}



// AbstractNode is a abstract base class with two type parameters: T (the value) and
// AbstractNodeSubtype (a stand-in class). AbstractNodeSubtype is constrained to be a subtype of AbstractNode<T,
// AbstractNodeSubtype>, ensuring that the node type can only be a subclass of AbstractNode.
//
// That is, this ensures that the any type passed as the realization of the
// generic has to be a subclass of AbstractNode.

// This allows this class to create objects of the placeholder class and return
// them as instances of the placeholder class because it is in the hierarchy.

export abstract class AbstractNode<T, AbstractNodeSubtype extends AbstractNode<T, AbstractNodeSubtype>> {

    private static counter = 0;
    private _id: string;
    private _children: AbstractNodeSubtype[] = [];
    public value: T | null;

    // constructor(value: T | null = null) {
    //     this.value = value;
    // }
    constructor(value: T | null = null) {
        this._id = `v${AbstractNode.counter++}`;
        this.value = value;
        this._children = [];
    }

    public get id(): string {
        return this._id;
    }

    public get children(): readonly AbstractNodeSubtype[] {
        return this._children;
    }

    public addChild(child: AbstractNodeSubtype): void {
        this._children.push(child);
    }

    public abstract createNode(value: T, ...args: any[]): AbstractNodeSubtype;

    public newChild(value: T, ...args: any[]): AbstractNodeSubtype {
        let newChild = this.createNode(value, ...args);
        this.addChild(newChild);
        return newChild;
    }

    public newParent(value: T, ...args: any[]): AbstractNodeSubtype {
        let newParent = this.createNode(value, ...args);
        newParent.addChild(this as any); // Safe cast as we're within the hierarchy
        return newParent;
    }
}
