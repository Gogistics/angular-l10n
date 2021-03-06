import { Injectable, ChangeDetectorRef } from '@angular/core';

import { Translation } from './translation';
import { LocaleService } from './locale.service';
import { TranslationService } from './translation.service';
import { InjectorRef } from '../models/injector-ref';

/**
 * Provides 'lang' to the translate pipe,
 * 'defaultLocale' & 'currency' to localeDecimal, localePercent & localeCurrency pipes.
 */
@Injectable() export class Localization extends Translation {

    public defaultLocale: string;
    public currency: string;

    constructor(
        protected locale: LocaleService = InjectorRef.get(LocaleService),
        protected translation: TranslationService = InjectorRef.get(TranslationService),
        protected changeDetectorRef?: ChangeDetectorRef
    ) {
        super(translation, changeDetectorRef);

        this.defaultLocale = this.locale.getDefaultLocale();
        // When the default locale changes, subscribes to the event & updates defaultLocale property.
        this.paramSubscriptions.push(this.locale.defaultLocaleChanged.subscribe(
            (defaultLocale: string) => {
                this.defaultLocale = defaultLocale;
                // OnPush Change Detection strategy.
                if (this.changeDetectorRef) { this.changeDetectorRef.markForCheck(); }
            }
        ));

        this.currency = this.locale.getCurrentCurrency();
        // When the currency changes, subscribes to the event & updates currency property.
        this.paramSubscriptions.push(this.locale.currencyCodeChanged.subscribe(
            (currency: string) => {
                this.currency = currency;
                // OnPush Change Detection strategy.
                if (this.changeDetectorRef) { this.changeDetectorRef.markForCheck(); }
            }
        ));
    }

}
