export class InputNumberComponent {
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


