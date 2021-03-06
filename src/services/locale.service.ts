import { Injectable, EventEmitter, Output } from '@angular/core';
import { Subject } from 'rxjs/Subject';

import { ILocaleConfig, LocaleConfig } from '../models/localization/locale-config';
import { ILocaleConfigAPI, LocaleConfigAPI } from '../models/localization/locale-config-api';
import { LocaleStorage } from './locale-storage';
import { DefaultLocale } from '../models/localization/default-locale';
import { Language } from '../models/types';

/**
 * Manages language, default locale & currency.
 */
export interface ILocaleService {

    languageCodeChanged: EventEmitter<string>;
    defaultLocaleChanged: EventEmitter<string>;
    currencyCodeChanged: EventEmitter<string>;

    loadTranslation: Subject<any>;

    /**
     * Configure the service in the application root module or in a feature module with lazy loading.
     */
    addConfiguration(): ILocaleConfigAPI;

    getConfiguration(): ILocaleConfig;

    init(): Promise<void>;

    getAvailableLanguages(): string[];

    getLanguageDirection(languageCode?: string): string;

    getCurrentLanguage(): string;

    getCurrentCountry(): string;

    getCurrentLocale(): string;

    getCurrentScript(): string;

    getCurrentNumberingSystem(): string;

    getCurrentCalendar(): string;

    getDefaultLocale(): string;

    getCurrentCurrency(): string;

    setCurrentLanguage(languageCode: string): void;

    setDefaultLocale(
        languageCode: string,
        countryCode: string,
        scriptCode?: string,
        numberingSystem?: string,
        calendar?: string
    ): void;

    setCurrentCurrency(currencyCode: string): void;

}

@Injectable() export class LocaleService implements ILocaleService {

    @Output() public languageCodeChanged: EventEmitter<string> = new EventEmitter<string>(true);
    @Output() public defaultLocaleChanged: EventEmitter<string> = new EventEmitter<string>(true);
    @Output() public currencyCodeChanged: EventEmitter<string> = new EventEmitter<string>(true);

    public loadTranslation: Subject<any> = new Subject();

    private defaultLocale: DefaultLocale = new DefaultLocale();

    private currencyCode: string;

    constructor(private configuration: LocaleConfig, private storage: LocaleStorage) { }

    public addConfiguration(): ILocaleConfigAPI {
        return new LocaleConfigAPI(this.configuration);
    }

    public getConfiguration(): ILocaleConfig {
        return this.configuration;
    }

    public async init(): Promise<void> {
        await this.initStorage();

        if (!!this.configuration.languageCode && !!this.configuration.countryCode) {
            this.initDefaultLocale();
        } else if (!!this.configuration.languageCode) {
            this.initLanguage();
        }

        if (!!this.configuration.currencyCode) {
            this.initCurrency();
        }
    }

    public getAvailableLanguages(): string[] {
        return this.configuration.languageCodes.map((language: Language) => language.code);
    }

    public getLanguageDirection(languageCode: string = this.defaultLocale.languageCode): string {
        const matchedLanguages: Language[] = this.matchLanguage(languageCode);
        return matchedLanguages[0].direction;
    }

    public getCurrentLanguage(): string {
        return this.defaultLocale.languageCode;
    }

    public getCurrentCountry(): string {
        if (!!this.defaultLocale.countryCode) {
            return this.defaultLocale.countryCode;
        }
        return "";
    }

    public getCurrentScript(): string {
        if (!!this.defaultLocale.scriptCode) {
            return this.defaultLocale.scriptCode;
        }
        return "";
    }

    public getCurrentLocale(): string {
        const locale: string = !!this.defaultLocale.countryCode
            ? this.defaultLocale.languageCode + "-" + this.defaultLocale.countryCode
            : this.defaultLocale.languageCode;
        return locale;
    }

    public getCurrentNumberingSystem(): string {
        if (!!this.defaultLocale.numberingSystem) {
            return this.defaultLocale.numberingSystem;
        }
        return "";
    }

    public getCurrentCalendar(): string {
        if (!!this.defaultLocale.calendar) {
            return this.defaultLocale.calendar;
        }
        return "";
    }

    public getDefaultLocale(): string {
        return this.defaultLocale.value;
    }

    public getCurrentCurrency(): string {
        return this.currencyCode;
    }

    public setCurrentLanguage(languageCode: string): void {
        if (this.defaultLocale.languageCode != languageCode) {
            this.defaultLocale.build(languageCode);
            this.storage.write("defaultLocale", this.defaultLocale.value);
            this.sendLanguageEvents();
            this.sendTranslationEvents();
        }
    }

    public setDefaultLocale(
        languageCode: string,
        countryCode: string,
        scriptCode?: string,
        numberingSystem?: string,
        calendar?: string
    ): void {
        if (this.defaultLocale.languageCode != languageCode ||
            this.defaultLocale.countryCode != countryCode ||
            this.defaultLocale.scriptCode != scriptCode ||
            this.defaultLocale.numberingSystem != numberingSystem ||
            this.defaultLocale.calendar != calendar) {

            this.defaultLocale.build(
                languageCode,
                countryCode,
                scriptCode,
                numberingSystem,
                calendar
            );

            this.storage.write("defaultLocale", this.defaultLocale.value);
            this.sendDefaultLocaleEvents();
            this.sendTranslationEvents();
        }
    }

    public setCurrentCurrency(currencyCode: string): void {
        if (this.currencyCode != currencyCode) {
            this.currencyCode = currencyCode;
            this.storage.write("currency", this.currencyCode);
            this.sendCurrencyEvents();
        }
    }

    private async initStorage(): Promise<void> {
        // Tries to retrieve default locale & currency from the browser storage.
        if (!this.defaultLocale.value) {
            const defaultLocale: string | null = await this.storage.read("defaultLocale");
            if (!!defaultLocale) {
                this.defaultLocale.value = defaultLocale;
            }
        }
        if (this.currencyCode == null) {
            const currencyCode: string | null = await this.storage.read("currency");
            if (!!currencyCode) {
                this.currencyCode = currencyCode;
            }
        }
    }

    private initLanguage(): void {
        if (!this.defaultLocale.languageCode) {
            const browserLanguage: string | null = this.getBrowserLanguage();
            let matchedLanguages: Language[] = [];
            if (!!browserLanguage) {
                matchedLanguages = this.matchLanguage(browserLanguage);
            }
            if (!!browserLanguage && matchedLanguages.length > 0) {
                this.defaultLocale.build(browserLanguage);
            } else {
                this.defaultLocale.build(this.configuration.languageCode);
            }
            this.storage.write("defaultLocale", this.defaultLocale.value);
        }
        this.sendLanguageEvents();
    }

    private initDefaultLocale(): void {
        if (!this.defaultLocale.value) {
            this.defaultLocale.build(
                this.configuration.languageCode,
                this.configuration.countryCode,
                this.configuration.scriptCode,
                this.configuration.numberingSystem,
                this.configuration.calendar
            );
            this.storage.write("defaultLocale", this.defaultLocale.value);
        }
        this.sendDefaultLocaleEvents();
    }

    private initCurrency(): void {
        if (this.currencyCode == null) {
            this.currencyCode = this.configuration.currencyCode;
            this.storage.write("currency", this.currencyCode);
        }
        this.sendCurrencyEvents();
    }

    private getBrowserLanguage(): string | null {
        let browserLanguage: string | null = null;
        if (typeof navigator !== "undefined" && navigator.language) {
            browserLanguage = navigator.language;
        }
        if (browserLanguage != null) {
            const index: number = browserLanguage.indexOf("-");
            if (index != -1) {
                browserLanguage = browserLanguage.substring(0, index);
            }
        }
        return browserLanguage;
    }

    private matchLanguage(languageCode: string): Language[] {
        const matchedLanguages: Language[] = this.configuration.languageCodes.filter(
            (language: Language) => {
                return language.code == languageCode;
            });
        return matchedLanguages;
    }

    private sendLanguageEvents(): void {
        this.languageCodeChanged.emit(this.defaultLocale.languageCode);
    }

    private sendDefaultLocaleEvents(): void {
        this.defaultLocaleChanged.emit(this.defaultLocale.value);
    }

    private sendCurrencyEvents(): void {
        this.currencyCodeChanged.emit(this.currencyCode);
    }

    private sendTranslationEvents(): void {
        // This event is subscribed by TranslationService to load the translation data.
        this.loadTranslation.next();
    }

}
