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
        viewDepthLimitPrimary: 2,    // number | null
        viewDepthLimitSecondary: 2,     // number | null
    },
    relationshipDefinitions: {
        "Parent": {
            designatedPropertyName: "entry-parents",
            invertedRelationshipPropertyName: "entry-children",
            categories: ["hierarchical"],
        },
        "Classifier": {
            designatedPropertyName: "entry-classifiers",
            invertedRelationshipPropertyName: "entry-classifications",
            categories: ["hierarchical"],
        },
        "Collection": {
            designatedPropertyName: "entry-collections",
            invertedRelationshipPropertyName: "entry-holdings",
            categories: ["hierarchical"],
        },
        "Author": {
            designatedPropertyName: "source-authors",
            invertedRelationshipPropertyName: "source-references",
            categories: ["hierarchical"],
        },
        "Collaborator": {
            designatedPropertyName: "entry-collaborators",
            invertedRelationshipPropertyName: "entry-collaborations",
            categories: ["hierarchical"],
        },
        "Reference (bibliographical)": {
            designatedPropertyName: "entry-bibliography",
            invertedRelationshipPropertyName: "entry-bibliography",
            categories: ["coordinate", "bibliographical"],
        },
        "Association": {
            designatedPropertyName: "entry-associations",
            invertedRelationshipPropertyName: "entry-associations",
            categories: ["coordinate"],
        },
        "Referral": {
            designatedPropertyName: "entry-referrals",
            invertedRelationshipPropertyName: "entry-referrals",
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

    hierarchicalRelationshipDefinitions(): RelationshipDefinition[] {
        return Object.values(this.relationshipDefinitions)
            .filter( (rdef: RelationshipDefinition) => rdef.categories?.some( (category: string) => category === "hierarchical"  ));
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

        // View Depth Limit Primary
        new Setting(container)
            .setName('View Depth Limit Primary')
            .setDesc('Primary view depth limit, can be null for no limit.')
            .addText(text => text
                .setValue(options.viewDepthLimitPrimary?.toString() || "")
                .onChange(async (value) => {
                    options.viewDepthLimitPrimary = value ? parseInt(value) : null; // Parse to int, null if empty
                    await this.saveSettingsFn();
                }));

        // View Depth Limit Secondary
        new Setting(container)
            .setName('View Depth Limit Secondary')
            .setDesc('Secondary view depth limit, can be null for no limit.')
            .addText(text => text
                .setValue(options.viewDepthLimitSecondary?.toString() || "")
                .onChange(async (value) => {
                    options.viewDepthLimitSecondary = value ? parseInt(value) : null; // Parse to int, null if empty
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

