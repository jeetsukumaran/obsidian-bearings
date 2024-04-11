import {
	App,
	CachedMetadata,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting
} from 'obsidian';

import * as _path from "path";

export type RelationshipDefinition = {
    designatedPropertyName?: string;
    invertedRelationshipPropertyName?: string;
    categories?: string[];
}

export interface BearingsSettingsData {
    options: {
        [name: string]: any;
    }
    relationshipDefinitions: {
        [name: string]: RelationshipDefinition,
    };
}

export const TRAJECTORIES_DEFAULT_SETTINGS: BearingsSettingsData = {
    options: {
        // globalNamespacePrefix: "entry-", // string | null
        titleField: ["title", "entry-title"],
        autoexpansionDepthLimit: 2,    // number | null
        discoveryDepthLimitPrimary: 2,    // number | null
        discoveryDepthLimitSecondary: 2,     // number | null
    },
    relationshipDefinitions: {
        "Parent": {
            designatedPropertyName: "entry-parents",
            invertedRelationshipPropertyName: "entry-children",
            categories: ["superordinate"],
        },
        "Classifier": {
            designatedPropertyName: "entry-classifiers",
            invertedRelationshipPropertyName: "entry-classifications",
            categories: ["superordinate"],
        },
        "Collection": {
            designatedPropertyName: "entry-collections",
            invertedRelationshipPropertyName: "entry-holdings",
            categories: ["superordinate"],
        },
        "Author": {
            designatedPropertyName: "source-authors",
            invertedRelationshipPropertyName: "source-references",
            categories: ["superordinate"],
        },
        "Collaborator": {
            designatedPropertyName: "entry-collaborators",
            invertedRelationshipPropertyName: "entry-collaborations",
            categories: ["superordinate"],
        },
        "Reference (bibliographical)": {
            designatedPropertyName: "entry-references",
            categories: ["coordinate", "bibliographical"],
        },
        "Bibliography": {
            designatedPropertyName: "entry-bibliography",
            categories: ["coordinate", "bibliographical"],
        },
        "Association": {
            designatedPropertyName: "entry-associations",
            categories: ["coordinate"],
        },
        "Referral": {
            designatedPropertyName: "entry-referrals",
            categories: ["coordinate"],
        },
        "Attachment": {
            designatedPropertyName: "entry-attachments",
            categories: ["coordinate"],
        },
    }
}

export class BearingsConfiguration {
    options: {
        [name: string]: any;
    }
    relationshipDefinitions: { [name: string]: RelationshipDefinition };

    constructor(settingsData: BearingsSettingsData) {
        this.relationshipDefinitions = {... settingsData.relationshipDefinitions};
        this.options = { ... settingsData.options };
    }

    superordinateRelationshipDefinitions(): RelationshipDefinition[] {
        return Object.values(this.relationshipDefinitions)
            .filter( (rdef: RelationshipDefinition) => rdef.categories?.some( (category: string) => category === "superordinate"  ));
    }

    coordinateRelationshipDefinitions(): RelationshipDefinition[] {
        return Object.values(this.relationshipDefinitions)
            .filter( (rdef: RelationshipDefinition) => rdef.categories?.some( (category: string) => category === "coordinate"  ));
    }

}

export class BearingsSettingsTab extends PluginSettingTab {
    plugin: Plugin;
    pluginConfiguration: BearingsConfiguration;
    saveSettingsFn: () => Promise<void>;

    constructor(app: App, plugin: Plugin, pluginConfiguration: BearingsConfiguration, saveSettingsFn: () => Promise<void>) {
        super(app, plugin);
        this.plugin = plugin;
        this.pluginConfiguration = pluginConfiguration;
        this.saveSettingsFn = saveSettingsFn;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Bearings Settings' });

        // Options Section
        const optionsDiv = containerEl.createDiv();
        optionsDiv.createEl('h3', { text: `Global options` });
        this.createOptionsSetting(optionsDiv, this.pluginConfiguration.options)

        containerEl.createDiv().createEl('h3', { text: `Relationship definitions` });
        Object.entries(this.pluginConfiguration.relationshipDefinitions).forEach(([relationshipName, definition]) => {
            const settingDiv = containerEl.createDiv();
            settingDiv.createEl('h4', { text: `${relationshipName}` });
            this.createRelationshipDefinitionSetting(settingDiv, relationshipName, definition);
        });

        // Add New Relationship Definition Button
        const addDefinitionButton = containerEl.createEl('button', { text: 'New relationship definition' });
        addDefinitionButton.onclick = () => {
            new AddRelationshipDefinitionModal(this.app, (definitionName, definition) => {
                this.pluginConfiguration.relationshipDefinitions[definitionName] = definition;
                this.saveSettingsFn().then(() => this.display());
            }).open();
        };

        // Reset to Default Button
        const resetButton = containerEl.createEl('button', { text: 'Reset to defaults' });
        resetButton.onclick = async () => {
            Object.assign(this.pluginConfiguration.relationshipDefinitions, TRAJECTORIES_DEFAULT_SETTINGS.relationshipDefinitions);
            await this.saveSettingsFn();
            this.display();
            new Notice('Settings reset to default.');
        };
    }

    processInt(value: string): number | null {
        if (value && value === "") {
            return 0;
        }
        if (value === "*") {
            return null;
        }
        const parsedValue = parseInt(value.trim());
        if (isNaN(parsedValue)) {
            return 0;
        } else {
            return parsedValue;
        }
    }

    createOptionsSetting(container: HTMLElement, options: any): void {

        // Global Namespace Prefix
        // new Setting(container)
        //     .setName('Global Namespace Prefix')
        //     .setDesc('A prefix for global namespacing, can be null.')
        //     .addText(text => text
        //         .setValue(options.globalNamespacePrefix || "")
        //         .onChange(async (value) => {
        //             options.globalNamespacePrefix = value || null; // Set to null if empty
        //             await this.saveSettingsFn();
        //         }));

        // Title field
        new Setting(container)
            .setName('Title fields')
            .setDesc('Comma-separated list of property names that will be used as the display text of each note.')
            .addText(text => text
                .setValue(options.titleField?.join(",") || "title, entry-title")
                .setDisabled(true)
                .onChange(async (value) => {
                    options.titleField = value ? value.toString().split(",").map( (s:string) => s.trim() ) : ["title", "entry-title"];
                    await this.saveSettingsFn();
                })
            );

        // View Depth Limit Primary
        new Setting(container)
            .setName('Primary views discovery depth limit')
            .setDesc('Discovery (recursion) depth limit for primary views: how many levels of links to follow when mapping subtrees of the focal note. Set to "*" for no limit. Major determinant of performance in larger, more densely connected vaults.')
            .addText(text => text .setValue(options.discoveryDepthLimitPrimary?.toString() || "")
                .onChange(async (value) => {
                    options.discoveryDepthLimitPrimary = this.processInt(value);
                    await this.saveSettingsFn();
                }));

        // View Depth Limit Secondary
        new Setting(container)
            .setName('Secondary views discovery depth limit')
            .setDesc('Discovery (recursion) depth limit for secondary views: how many levels of links to follow when mapping subtrees of the focal note. Set to "*" for no limit. Major determinant of performance in larger, more densely connected vaults.')
            .addText(text => text
                .setValue(options.discoveryDepthLimitSecondary?.toString() || "")
                .onChange(async (value) => {
                    options.discoveryDepthLimitSecondary = this.processInt(value);
                    await this.saveSettingsFn();
                }));

        // View Depth Limit Primary
        new Setting(container)
            .setName('Default view subtree autoexpansion limit')
            .setDesc('How many levels deep should the subtree be open? This value restricts the depth of the subtree nodes that are open by default rather than showing it open to the full discovery or mapped limit. Set to "*" for no limit. Less is more here for mental bandwidth reasons :) ')
            .addText(text => text .setValue(options.autoexpansionDepthLimitPrimary?.toString() || "")
                .onChange(async (value) => {
                    options.autoexpansionDepthLimit = this.processInt(value);
                    await this.saveSettingsFn();
                }));

    }

    createRelationshipDefinitionSetting(container: HTMLElement, relationshipName: string, definition: RelationshipDefinition): void {
        new Setting(container)
            .setName('Designation property name')
            .setDesc('The property name that the focal note will use to define this relationship in terms of other notes to itself.')
            .addText(text => text
                .setValue(definition.designatedPropertyName || "")
                .onChange(async (value) => {
                    definition.designatedPropertyName = value;
                    await this.saveSettingsFn();
                }));

        new Setting(container)
            .setName('Inverted (inlinked) property name')
            .setDesc('The property name that the focal note will use to define the inverse of this relationship in terms of other notes to itself.')
            .addText(text => text
                .setValue(definition.invertedRelationshipPropertyName || "")
                .onChange(async (value) => {
                    definition.invertedRelationshipPropertyName = value;
                    await this.saveSettingsFn();
                }));

        new Setting(container)
            .setName('Categories')
            .setDesc('Categories for this relationship.')
            .addText(text => text
                .setValue(definition.categories?.join(', ') || "")
                .onChange(async (value) => {
                    definition.categories = value.split(',').map(s => s.trim());
                    await this.saveSettingsFn();
                }));

        // Remove Relationship Definition Button
        new Setting(container)
            .addButton(button => button
                .setButtonText('Remove')
                .onClick(async () => {
                    delete this.pluginConfiguration.relationshipDefinitions[relationshipName];
                    await this.saveSettingsFn();
                    this.display();
                }));
    }
}

class AddRelationshipDefinitionModal extends Modal {
    onSubmit: (definitionName: string, definition: RelationshipDefinition) => void;

    constructor(app: App, onSubmit: (definitionName: string, definition: RelationshipDefinition) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        let definitionName = '';
        let designatedPropertyName = '';
        let invertedRelationshipPropertyName = '';
        let categories = '';

        const { contentEl } = this;
        contentEl.createEl('h3', { text: 'Add new relationship definition' });

        new Setting(contentEl)
            .setName('Definition name')
            .addText(text => text.onChange(value => definitionName = value));

        new Setting(contentEl)
            .setName('Outlinked property name')
            .addText(text => text.onChange(value => designatedPropertyName = value));

        new Setting(contentEl)
            .setName('Inlinked property name')
            .addText(text => text.onChange(value => invertedRelationshipPropertyName = value));

        new Setting(contentEl)
            .setName('Categories')
            .addText(text => text.onChange(value => categories = value));

        new Setting(contentEl)
            .addButton(button =>
                button
                .setButtonText('Add')
                .setCta()
                .onClick(() => {
                    if (!definitionName) {
                        new Notice('Definition name is required.');
                        return;
                    }
                    this.onSubmit(definitionName, {
                        designatedPropertyName,
                        invertedRelationshipPropertyName,
                        categories: categories.split(',').map(s => s.trim()),
                    });
                    this.close();
                }));
    }

    onClose() {
        this.contentEl.empty();
    }
}

