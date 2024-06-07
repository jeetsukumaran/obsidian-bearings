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

export type RelationshipDefinition = {
    primaryRelationshipRole?: string;
    primaryRelationshipPropertyName?: string;
    complementaryRelationshipPropertyName?: string;
    complementaryRelationshipRole?: string;
    categories?: string[];
}

export interface BearingsSettingsData {
    schemaVersion: string;
    options: {
        [name: string]: any;
    }
    relationshipDefinitions: {
        [name: string]: RelationshipDefinition,
    };
}

export const DEFAULT_TITLE_FIELDS: string[] = [
    "entry-title",
    "title",
];

export const TRAJECTORIES_DEFAULT_SETTINGS: BearingsSettingsData = {
    schemaVersion: "0.0.0",
    options: {
        titleField: ["title", "entry-title"],
        glyphField: ["glyphs", "entry-glyphs"],
        autoexpansionDepthLimit: 2,
        discoveryDepthLimitPrimary: 2,
        discoveryDepthLimitSecondary: 2,
        inactiveFileFocalNote: "",
    },
    relationshipDefinitions: {
        "Parent": {
            primaryRelationshipRole: "Parent",
            primaryRelationshipPropertyName: "entry-parents",
            complementaryRelationshipRole: "Child",
            complementaryRelationshipPropertyName: "entry-children",
            categories: ["superordinate"]
        },
        "Classifier": {
            primaryRelationshipRole: "Classifier",
            primaryRelationshipPropertyName: "entry-classifiers",
            complementaryRelationshipRole: "Classification",
            complementaryRelationshipPropertyName: "entry-classifications",
            categories: ["superordinate"]
        },
        "Collection": {
            primaryRelationshipRole: "Collection",
            primaryRelationshipPropertyName: "entry-collections",
            complementaryRelationshipPropertyName: "entry-items",
            complementaryRelationshipRole: "Item",
            categories: ["superordinate"]
        },
        "Author": {
            primaryRelationshipRole: "Author",
            primaryRelationshipPropertyName: "source-authors",
            complementaryRelationshipRole: "Bibliography",
            complementaryRelationshipPropertyName: "entry-bibliography",
            categories: ["superordinate"]
        },
        "Collaborator": {
            primaryRelationshipRole: "Collaborator",
            primaryRelationshipPropertyName: "entry-collaborators",
            complementaryRelationshipRole: "Collaboration",
            complementaryRelationshipPropertyName: "entry-collaborations",
            categories: ["superordinate"]
        },
        "Attachment": {
            categories: ["superordinate"],
            complementaryRelationshipRole: "Attachment",
            complementaryRelationshipPropertyName: "entry-attachments",
        },
        "Topic": {
            primaryRelationshipPropertyName: "entry-topics",
            primaryRelationshipRole: "Topic",
            complementaryRelationshipPropertyName: "entry-cases",
            complementaryRelationshipRole: "Case",
            categories: ["superordinate"]
        },
        "Referral": {
            primaryRelationshipRole: "Referrals",
            primaryRelationshipPropertyName: "entry-referrals",
            categories: ["symmetrical"]
        },
    }
}

export class BearingsConfiguration {
    options: {
        [name: string]: any;
    }
    relationshipDefinitions: {
        [name: string]: RelationshipDefinition,
    }

    constructor(settingsData: BearingsSettingsData) {
        this.relationshipDefinitions = { ...settingsData.relationshipDefinitions };
        this.options = { ...settingsData.options };
    }

    superordinateRelationshipDefinitions(): RelationshipDefinition[] {
        return Object.values(this.relationshipDefinitions)
            .filter(rdef => rdef.categories?.includes("superordinate"));
    }

    symmetricalRelationshipDefinitions(): RelationshipDefinition[] {
        return Object.values(this.relationshipDefinitions)
            .filter(rdef => rdef.categories?.includes("symmetrical"));
    }

    get titleFields(): string[] {
        return this.options?.titleField || DEFAULT_TITLE_FIELDS;
    }
}

export class BearingsSettingsTab extends PluginSettingTab {
    plugin: Plugin;
    pluginConfiguration: BearingsConfiguration;
    saveSettingsFn: () => Promise<void>;
    relationshipCategoryChoices: string[];

    constructor(app: App, plugin: Plugin, pluginConfiguration: BearingsConfiguration, saveSettingsFn: () => Promise<void>) {
        super(app, plugin);
        this.plugin = plugin;
        this.pluginConfiguration = pluginConfiguration;
        this.saveSettingsFn = saveSettingsFn;
        this.relationshipCategoryChoices = ["superordinate", "symmetrical"];
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Settings' });

        // Options Section
        const optionsDiv = containerEl.createDiv();
        new Setting(optionsDiv).setName("Options").setHeading();
        this.createOptionsSetting(optionsDiv, this.pluginConfiguration.options)

        // Relationship Definitions Section
        new Setting(containerEl).setName("Relationship definitions").setHeading();
        Object.entries(this.pluginConfiguration.relationshipDefinitions)
            .sort((a, b) => a[0].localeCompare(b[0])) // Sorting entries alphabetically by relationshipName
            .forEach(([relationshipName, definition]) => {
                const settingDiv = new Setting(containerEl).setName(`Relationship: '${relationshipName}'`).setHeading();
                this.createRelationshipDefinitionSetting(containerEl, relationshipName, definition);
            });

        // Add New Relationship Definition Button
        new Setting(containerEl).setName("Manage relationship definitions").setHeading();
        const addDefinitionButton = containerEl.createEl('button', { text: 'New relationship definition' });
        addDefinitionButton.onclick = () => {
            new AddRelationshipDefinitionModal(this.app,
                (definitionName, definition) => {
                this.pluginConfiguration.relationshipDefinitions[definitionName] = definition;
                this.saveSettingsFn().then(() => this.display());
                },
                this.relationshipCategoryChoices,
            ).open();
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

    processIntLimit(value: string): number | null {
        if (value === "") {
            return 0;
        }
        if (value === "*") {
            return null;
        }
        const parsedValue = parseInt(value.trim());
        return isNaN(parsedValue) ? null : parsedValue;
    }

    displayIntLimit(value: number | null): string {
        return value === null ? "*" : value.toString();
    }

    createOptionsSetting(container: HTMLElement, options: any): void {
        new Setting(container)
            .setName('Title fields')
            .setDesc('Comma-separated list of property names that will be used as the display text of each note. Custom values not yet supported.')
            .addText(text => text
                .setValue((options.titleField || DEFAULT_TITLE_FIELDS).join(", "))
                .onChange(async (value) => {
                    options.titleField = (value ? value : DEFAULT_TITLE_FIELDS).toString().split(",").map(s => s.trim());
                    await this.saveSettingsFn();
                })
            );

        new Setting(container)
            .setName('Primary views subtree mapping depth limit')
            .setDesc('Discovery (recursion) depth limit for primary views: how many levels of links to follow when mapping subtrees of the focal note. Set to "*" for no limit. Major determinant of performance in larger, more densely connected vaults.')
            .addText(text => text.setValue(this.displayIntLimit(options.discoveryDepthLimitPrimary?.toString() || ""))
                .onChange(async (value) => {
                    options.discoveryDepthLimitPrimary = this.processIntLimit(value);
                    await this.saveSettingsFn();
                }));

        new Setting(container)
            .setName('Secondary views subtree mapping depth limit')
            .setDesc('Discovery (recursion) depth limit for secondary views: how many levels of links to follow when mapping subtrees of the focal note. Set to "*" for no limit. Major determinant of performance in larger, more densely connected vaults.')
            .addText(text => text.setValue(this.displayIntLimit(options.discoveryDepthLimitSecondary?.toString() || ""))
                .onChange(async (value) => {
                    options.discoveryDepthLimitSecondary = this.processIntLimit(value);
                    await this.saveSettingsFn();
                }));

        new Setting(container)
            .setName('Default view subtree node expansion limit')
            .setDesc('This value restricts the depth of the subtree nodes that are open by default. Set to "*" to open to the full mapped or discovery limit. Less is more here for mental bandwidth reasons :) ')
            .addText(text => text.setValue(this.displayIntLimit(options.autoexpansionDepthLimit?.toString() || ""))
                .onChange(async (value) => {
                    options.autoexpansionDepthLimit = this.processIntLimit(value);
                    await this.saveSettingsFn();
                }));

        new Setting(container)
            .setName('Default focal note path')
            .setDesc('Path of note to assume as focal note if there is no active file. Provide the full absolute path from the root of the vault, e.g. "00-indexes/root-index.md".')
            .addText(text => text
                .setValue(options.inactiveFileFocalNote || "")
                .onChange(async (value) => {
                    options.inactiveFileFocalNote = value;
                    await this.saveSettingsFn();
                }));
    }

    createRelationshipDefinitionSetting(container: HTMLElement, relationshipName: string, definition: RelationshipDefinition): void {

        new Setting(container)
            .setName('Primary relationship role')
            .setDesc('A label for the role of a note with this relationship to the focal note.')
            .addText(text => text
                .setValue(definition.primaryRelationshipRole || "")
                .setPlaceholder("Parent")
                .onChange(async (value) => {
                    definition.primaryRelationshipRole = value;
                    await this.saveSettingsFn();
                }));

        new Setting(container)
            .setName('Primary relationship property name')
            .setDesc("The name of the property field listing notes with this relationship to the focal note. E.g. Notes with a 'Parent' relationship might be listed under the 'entry-parents' property.")
            .addText(text => text
                .setValue(definition.primaryRelationshipPropertyName || "")
                .setPlaceholder("entry-parents")
                .onChange(async (value) => {
                    definition.primaryRelationshipPropertyName = value;
                    await this.saveSettingsFn();
                }));

        new Setting(container)
            .setName('Complementary relationship role')
            .setDesc('A label for the role of a note with the inverse or reflection of this relationship to the focal note.')
            .addText(text => text
                .setValue(definition.complementaryRelationshipRole || "")
                .setPlaceholder("Child")
                .onChange(async (value) => {
                    definition.complementaryRelationshipRole = value;
                    await this.saveSettingsFn();
                }));

        new Setting(container)
            .setName('Complementary relationship property name')
            .setDesc("In asymmetrical relationships, the name of the property field listing notes with the inverse or reflection of the primary relationship. E.g., if a 'Parent' relationship is established above with the 'entry-parents' property, here describe the inverse: 'entry-children' with the label of 'Child'. This field is ignored in symmetrical relationships.")
            .addText(text => text
                .setValue(definition.complementaryRelationshipPropertyName || "")
                .setPlaceholder("entry-children")
                .onChange(async (value) => {
                    definition.complementaryRelationshipPropertyName = value;
                    await this.saveSettingsFn();
                }));

        new Setting(container)
            .setName('Categories')
            .setDesc('Categories for this relationship.')
            .addDropdown(dropdown => {
                const categories = ['superordinate', 'symmetrical'];
                categories.forEach(category => {
                    dropdown.addOption(category, category);
                });
                dropdown.setValue(definition.categories?.[0] || categories[0])
                    .onChange(async (value) => {
                        definition.categories = [value];
                        await this.saveSettingsFn();
                    });
            });

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
    relationshipCategoryChoices: string[];

    constructor(app: App, onSubmit: (definitionName: string, definition: RelationshipDefinition) => void, relationshipCategoryChoices: string[]) {
        super(app);
        this.onSubmit = onSubmit;
        this.relationshipCategoryChoices = relationshipCategoryChoices;
    }

    onOpen() {
        let definitionName = '';
        let primaryRelationshipPropertyName = '';
        let complementaryRelationshipPropertyName = '';
        let primaryRelationshipRole = '';
        let complementaryRelationshipRole = '';
        let categories: string[] = [];

        const { contentEl } = this;
        contentEl.createEl('h3', { text: 'Add new relationship definition' });

        new Setting(contentEl)
            .setName('Relationship name')
            .addText(text => text.onChange(value => definitionName = value));

        new Setting(contentEl)
            .setName('Primary relationship label')
            .addText(text => text.onChange(value => primaryRelationshipRole = value));

        new Setting(contentEl)
            .setName('Primary relationship property name')
            .addText(text => text.onChange(value => primaryRelationshipPropertyName = value));

        new Setting(contentEl)
            .setName('Complementary relationship label')
            .addText(text => text.onChange(value => complementaryRelationshipRole = value));

        new Setting(contentEl)
            .setName('Complementary relationship property name')
            .addText(text => text.onChange(value => complementaryRelationshipPropertyName = value));

        new Setting(contentEl)
            .setName('Categories')
            .addDropdown(dropdown => {
                this.relationshipCategoryChoices.forEach(category => {
                    dropdown.addOption(category, category);
                });
                dropdown.onChange(value => {
                    categories = [value];
                });
            });

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
                            primaryRelationshipPropertyName,
                            complementaryRelationshipPropertyName,
                            primaryRelationshipRole,
                            complementaryRelationshipRole,
                            categories,
                        });
                        this.close();
                    }));
    }

    onClose() {
        this.contentEl.empty();
    }
}


