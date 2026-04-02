// Global variables
let currentTier = null;
let debugMode = false;
let showNaturalPricing = false; // Toggle between traditional and natural pricing
let pricingOnlyMode = false; // True when user skips questions and views all pricing

// Update tier display as user types
document.getElementById('acreage').addEventListener('input', function() {
    const acres = parseFloat(this.value);
    const tierDisplay = document.getElementById('tierDisplay');
    
    const btnViewPricing = document.getElementById('btnViewPricing');

    if (!acres || acres <= 0) {
        tierDisplay.innerHTML = '';
        currentTier = null;
        btnViewPricing.style.display = 'none';
        return;
    }

    if (acres > 3.0) {
        tierDisplay.innerHTML = '<strong>™🏏 Properties over 3.0 acres require a manual quote</strong>';
        tierDisplay.classList.add('warning');
        currentTier = null;
        btnViewPricing.style.display = 'none';
        return;
    }

    currentTier = determineTier(acres);
    tierDisplay.classList.remove('warning');
    tierDisplay.innerHTML = `<strong>Pricing Tier:</strong> ${currentTier} acre coverage`;
    btnViewPricing.style.display = 'block';
});

function determineTier(acres) {
    if (acres <= 0.1) return "Up to 0.10";
    
    for (const boundary of PRICING_JSON.tiering.boundaries) {
        if (acres > boundary.lower_gt && acres <= boundary.upper_le) {
            return boundary.tier_label;
        }
    }
    
    return "Up to 3.00";
}

function calculatePackages() {
    // Validate inputs
    const acreage = parseFloat(document.getElementById('acreage').value);
    if (!acreage || acreage <= 0 || acreage > 3.0) {
        alert('Please enter a valid acreage between 0.01 and 3.00 acres');
        return;
    }
    
    const answers = {
        pest_concern: document.querySelector('input[name="pest_concern"]:checked')?.value,
        standing_water: document.querySelector('input[name="standing_water"]:checked')?.value,
        kids_pets: document.querySelector('input[name="kids_pets"]:checked')?.value,
        yard_use: document.querySelector('input[name="yard_use"]:checked')?.value,
        payment_preference: document.querySelector('input[name="payment_preference"]:checked')?.value
    };
    
    // Check all questions are answered
    for (const [key, value] of Object.entries(answers)) {
        if (!value) {
            alert('Please answer all questions before proceeding');
            return;
        }
    }
    
    pricingOnlyMode = false;
    document.querySelector('.copy-section').style.display = '';

    // Get recommendations from lookup table
    const recommendations = getRecommendations(answers);

    // Display results
    displayResults(recommendations, answers, acreage);

    // Add showing-results class to hide header on results page
    document.body.classList.add('showing-results');
    
    // Switch to results page
    document.getElementById('page1').classList.remove('active');
    document.getElementById('page2').classList.add('active');
    
    // Scroll to top of page to show primary recommendation
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getRecommendations(answers) {
    const key = `${answers.pest_concern}|${answers.standing_water}|${answers.kids_pets}|${answers.yard_use}|${answers.payment_preference}`;
    const packages = RECOMMENDATIONS[key];
    if (!packages) {
        console.warn("No recommendation found for:", key);
        return [
            { pkg: "pps_biweekly", score: 0 },
            { pkg: "prepaid_12_biweekly", score: 0 },
            { pkg: "mem_lab_6_triweekly", score: 0 }
        ];
    }
    return packages.map((pkg, i) => ({ pkg, score: 3 - i }));
}

function viewAllPricing() {
    const acreage = parseFloat(document.getElementById('acreage').value);
    if (!acreage || acreage <= 0 || acreage > 3.0) {
        alert('Please enter a valid acreage between 0.01 and 3.00 acres');
        return;
    }

    pricingOnlyMode = true;

    // Clear recommendations section
    document.getElementById('recommendedPackages').innerHTML = '';

    // Hide CRM notes in pricing-only mode
    document.querySelector('.copy-section').style.display = 'none';

    // Show all packages directly
    const container = document.getElementById('allPackages');
    container.innerHTML = '<h3>All Package Pricing</h3>';

    const allPackages = [
        'pps_biweekly', 'pps_triweekly', 'pps_monthly',
        'prepaid_10_biweekly', 'prepaid_12_biweekly', 'prepaid_14_biweekly',
        'mem_lab_6_triweekly', 'budget_12mo_monthly',
        'event_non_holiday', 'event_holiday'
    ];

    allPackages.forEach(pkg => {
        const packageDiv = createPackageCard(pkg, currentTier, null, false, 0);
        container.appendChild(packageDiv);
    });

    container.classList.add('show');

    // Hide Show/Hide All buttons since we're already showing all
    document.getElementById('btnShowAll').style.display = 'none';
    document.getElementById('btnHideAll').style.display = 'none';

    // Switch to results page
    document.body.classList.add('showing-results');
    document.getElementById('page1').classList.remove('active');
    document.getElementById('page2').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function displayResults(recommendations, answers, acreage) {
    const container = document.getElementById('recommendedPackages');
    container.innerHTML = '';
    
    const badges = ['Primary Recommendation', 'Fallback Option 1', 'Fallback Option 2'];
    
    recommendations.forEach((rec, index) => {
        const packageDiv = createPackageCard(
            rec.pkg,
            currentTier,
            badges[index],
            true,
            rec.score,
            answers
        );
        container.appendChild(packageDiv);
    });
    
    // Prepare CRM notes
    const crmNotes = prepareCRMNotes(recommendations, answers, acreage);
    document.getElementById('crmNotes').textContent = crmNotes;
}

function createPackageCard(packageKey, tier, badge, isRecommended, score, answers) {
    const div = document.createElement('div');
    div.className = isRecommended ? 'package-card recommended' : 'package-card';
    
    const packageName = PACKAGE_NAMES[packageKey] || packageKey;
    const traditionalPrice = PRICING_JSON.packages_by_tier[packageKey]?.[tier] || 'N/A';
    
    let naturalPrice = 'N/A';
    let naturalDisplay = 'N/A';
    
    if (packageKey === 'pps_biweekly' || packageKey === 'pps_monthly' || packageKey === 'pps_triweekly') {
        naturalPrice = traditionalPrice + PRICING_JSON.surcharges.natural.pps_per_application;
        naturalDisplay = `$${naturalPrice}/app`;
    } else if (packageKey === 'budget_12mo_monthly') {
        naturalPrice = traditionalPrice + PRICING_JSON.surcharges.natural.budget_per_month;
        naturalDisplay = `$${naturalPrice}/mo`;
    } else if (packageKey === 'prepaid_10_biweekly') {
        naturalPrice = traditionalPrice + PRICING_JSON.surcharges.natural.prepaid_10_total;
        naturalDisplay = `$${naturalPrice}`;
    } else if (packageKey === 'prepaid_12_biweekly') {
        naturalPrice = traditionalPrice + PRICING_JSON.surcharges.natural.prepaid_12_total;
        naturalDisplay = `$${naturalPrice}`;
    } else if (packageKey === 'prepaid_14_biweekly') {
        naturalPrice = traditionalPrice + PRICING_JSON.surcharges.natural.prepaid_14_total;
        naturalDisplay = `$${naturalPrice}`;
    } else if (packageKey === 'mem_lab_6_triweekly') {
        naturalPrice = traditionalPrice + PRICING_JSON.surcharges.natural.mem_lab_total;
        naturalDisplay = `$${naturalPrice}`;
    } else if (packageKey === 'event_non_holiday' || packageKey === 'event_holiday') {
        // Event sprays don't have a natural surcharge - show traditional price
        naturalPrice = traditionalPrice;
        naturalDisplay = traditionalPrice !== 'N/A' ? `$${traditionalPrice} (one-time)` : 'N/A';
    }
    
    let traditionalDisplay = `$${traditionalPrice}`;
    if (packageKey.includes('pps')) {
        traditionalDisplay = `$${traditionalPrice}/app`;
    } else if (packageKey === 'budget_12mo_monthly') {
        traditionalDisplay = `$${traditionalPrice}/mo`;
    } else if (packageKey.includes('event')) {
        traditionalDisplay = `$${traditionalPrice} (one-time)`;
    }
    
    // Determine which pricing to show based on toggle
    let displayPrice = traditionalDisplay;
    let displayType = 'Traditional';
    
    if (showNaturalPricing) {
        displayPrice = naturalDisplay;
        displayType = 'All Natural';
    }
    
    let html = `
        <div class="package-header">
            <h3 class="package-title">${packageName}</h3>
            ${badge ? `<span class="recommendation-badge">${badge}</span>` : ''}
        </div>
        <div class="pricing-row">
            <div class="pricing-option" style="flex: 1; max-width: none;">
                <div class="pricing-label">${displayType}</div>
                <div class="pricing-amount">${displayPrice}</div>
            </div>
        </div>
    `;
    
    // Add savings breakdown for prepaid packages
    if (packageKey === 'prepaid_10_biweekly' || packageKey === 'prepaid_12_biweekly' || packageKey === 'prepaid_14_biweekly') {
        const applicationsMap = {
            'prepaid_10_biweekly': { total: 10, paid: 9 },
            'prepaid_12_biweekly': { total: 12, paid: 11 },
            'prepaid_14_biweekly': { total: 14, paid: 13 }
        };
        const appInfo = applicationsMap[packageKey];
        const ppsBiweeklyPrice = PRICING_JSON.packages_by_tier['pps_biweekly']?.[tier] || 0;
        
        if (showNaturalPricing) {
            // Show natural pricing breakdown
            const naturalPackagePrice = naturalPrice;
            if (typeof naturalPackagePrice === 'number') {
                const naturalPPSPrice = ppsBiweeklyPrice + PRICING_JSON.surcharges.natural.pps_per_application;
                const naturalRegularTotal = naturalPPSPrice * appInfo.total;
                const naturalYouPay = naturalPPSPrice * appInfo.paid;
                const naturalSavings = naturalPPSPrice;
                
                html += `
                    <div style="margin-top: 16px; padding: 16px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; border: 2px solid #86efac;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div style="font-weight: 700; color: #166534; font-size: 1.05rem;">🌿 All Natural Prepay & Save</div>
                            <div style="background: #22c55e; color: white; padding: 4px 12px; border-radius: 16px; font-size: 0.85rem; font-weight: 700;">Save $${naturalSavings}</div>
                        </div>
                        <div style="padding: 12px; background: white; border-radius: 8px; margin-bottom: 12px;">
                            <div style="font-size: 0.85rem; color: #166534; margin-bottom: 8px; line-height: 1.5;">
                                <strong>Compare:</strong> All Natural pay-per-spray would cost<br>
                                <span style="text-decoration: line-through; color: #991b1b; font-size: 1.05rem; font-weight: 600;">$${naturalPPSPrice} × ${appInfo.total} applications = $${naturalRegularTotal}</span>
                            </div>
                            <div style="font-size: 0.9rem; color: #15803d; font-weight: 700; padding: 8px 0; border-top: 2px solid #86efac; border-bottom: 2px solid #86efac; margin: 8px 0;">
                                <strong>You pay:</strong> $${naturalPPSPrice} × ${appInfo.paid} = $${naturalYouPay}<br>
                                <span style="color: #22c55e; font-size: 1.1rem;">+ 1 FREE APPLICATION! 🎉</span>
                            </div>
                            <div style="font-size: 1rem; color: #166534; font-weight: 700; margin-top: 8px;">
                                = ${appInfo.total} total applications for $${naturalPackagePrice}
                            </div>
                        </div>
                        <div style="font-size: 0.85rem; color: #15803d; text-align: center; font-weight: 600;">
                            ✔ Same great $${naturalPPSPrice}/application rate + FREE spray bonus!
                        </div>
                    </div>
                `;
            }
        } else {
            // Show traditional pricing breakdown
            const packagePrice = traditionalPrice;
            const regularTotal = ppsBiweeklyPrice * appInfo.total;
            const youPay = ppsBiweeklyPrice * appInfo.paid;
            const savings = ppsBiweeklyPrice;
            
            html += `
                <div style="margin-top: 16px; padding: 16px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; border: 2px solid #86efac;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <div style="font-weight: 700; color: #166534; font-size: 1.05rem;">💰 Traditional Prepay & Save</div>
                        <div style="background: #22c55e; color: white; padding: 4px 12px; border-radius: 16px; font-size: 0.85rem; font-weight: 700;">Save $${savings}</div>
                    </div>
                    <div style="padding: 12px; background: white; border-radius: 8px; margin-bottom: 12px;">
                        <div style="font-size: 0.85rem; color: #166534; margin-bottom: 8px; line-height: 1.5;">
                            <strong>Compare:</strong> Pay-per-spray would cost<br>
                            <span style="text-decoration: line-through; color: #991b1b; font-size: 1.05rem; font-weight: 600;">$${ppsBiweeklyPrice} × ${appInfo.total} applications = $${regularTotal}</span>
                        </div>
                        <div style="font-size: 0.9rem; color: #15803d; font-weight: 700; padding: 8px 0; border-top: 2px solid #86efac; border-bottom: 2px solid #86efac; margin: 8px 0;">
                            <strong>You pay:</strong> $${ppsBiweeklyPrice} × ${appInfo.paid} = $${youPay}<br>
                            <span style="color: #22c55e; font-size: 1.1rem;">+ 1 FREE APPLICATION! 🎉</span>
                        </div>
                        <div style="font-size: 1rem; color: #166534; font-weight: 700; margin-top: 8px;">
                            = ${appInfo.total} total applications for $${packagePrice}
                        </div>
                    </div>
                    <div style="font-size: 0.85rem; color: #15803d; text-align: center; font-weight: 600;">
                        ✔ Same great $${ppsBiweeklyPrice}/application rate + FREE spray bonus!
                    </div>
                </div>
            `;
        }
    }
    
    // Add talking points for recommended packages
    if (isRecommended) {
        const tp = getTalkingPoints(packageKey, answers);
        html += `
            <div class="talking-points">
                <h4 class="collapsed" onclick="toggleTalkingPoints(this)">Why this package?</h4>
                <div class="tp-content collapsed">
                    <div class="tp-pitch">${tp.pitch}</div>
                    <div class="tp-best-for"><strong>Best For:</strong> ${tp.bestFor}</div>
                    <div class="tp-section">
                        <div class="tp-section-title">Must-Mention Details</div>
                        <ul>${tp.details.map(d => `<li>${d}</li>`).join('')}</ul>
                    </div>
                    ${tp.contextual.length > 0 ? `
                    <div class="tp-section">
                        <div class="tp-section-title">Why It Fits This Customer</div>
                        <ul>${tp.contextual.map(c => `<li>${c}</li>`).join('')}</ul>
                    </div>` : ''}
                </div>
            </div>
        `;
    }
    
    // Add debug score
    if (debugMode) {
        html += `<div class="score-debug show">Score: ${score}</div>`;
    }
    
    div.innerHTML = html;
    return div;
}

function getTalkingPoints(packageKey, answers) {
    const packageData = {
        'pps_biweekly': {
            pitch: 'It\u2019s a great flexible option, serviced on a bi-weekly basis. The treatment window is every 11\u201317 days which matches the mosquito life cycle to provide your most consistent experience. Although it\u2019s a flexible plan, we ask that you receive a minimum of 7 applications. Typically we treat until it gets cold in the fall, but if you\u2019d ever like to stop earlier, just shoot us a text or a call and we\u2019ll pause your service until the next season. Based on your property size, it would be <strong>$PRICE per application</strong>.',
            bestFor: 'Customers who want flexibility without a long-term commitment.',
            details: [
                '<strong>No contract</strong> \u2014 cancel or pause anytime with a call or text',
                'Biweekly service every 11\u201317 days (matches mosquito life cycle)',
                'Minimum of 7 applications required',
                'Payment charged at each visit (no checks or cash)',
                'Treats until cold weather in fall',
                'Mosquito, tick, and flea protection included',
                'Satisfaction Guarantee \u2014 free retreatments if pest activity occurs between visits'
            ]
        },
        'pps_triweekly': {
            pitch: 'This is our triweekly pay-as-you-go option \u2014 same flexibility as our biweekly plan but on a 3-week schedule. It\u2019s a great fit for properties with a tick concern because the triweekly cadence targets tick lifecycles, and you still get our full guarantee for mosquitoes, ticks, and fleas. No contract, no upfront payment \u2014 we just ask for a minimum of 7 applications. Based on your property size, it would be <strong>$PRICE per application</strong>, charged at each visit.',
            bestFor: 'Customers with a tick concern who still want mosquito and flea coverage guaranteed.',
            details: [
                '<strong>No contract</strong> \u2014 cancel or pause anytime with a call or text',
                'Triweekly service (every 3 weeks)',
                'Minimum of 7 applications required',
                'Payment charged at each visit (no checks or cash)',
                'Full mosquito, tick, and flea protection with Satisfaction Guarantee',
                'Unlike our monthly plan, triweekly <strong>still guarantees</strong> mosquito and flea coverage'
            ]
        },
        'pps_monthly': {
            pitch: 'This is our monthly tick control program \u2014 designed specifically for properties where ticks are the primary concern. The monthly cadence targets the tick lifecycle. It\u2019s flexible with no contract and no upfront payment, and we ask for a minimum of 7 applications. One important thing \u2014 because of the monthly schedule, <strong>this plan does not guarantee mosquito protection, only ticks</strong>. Based on your property size, it would be <strong>$PRICE per application</strong>, charged at each visit.',
            bestFor: 'Customers with a primary tick concern on tick-heavy or wooded properties.',
            details: [
                '<strong>No contract</strong> \u2014 cancel or pause anytime',
                'Monthly applications targeting the tick lifecycle',
                'Minimum of 7 applications required',
                'Payment charged at each visit (no checks or cash)',
                'Tick protection with Satisfaction Guarantee',
                '<strong>IMPORTANT: Does NOT guarantee mosquito protection \u2014 only ticks</strong>'
            ]
        },
        'prepaid_10_biweekly': {
            pitch: 'So this plan gives you 3 coverage options \u2014 5, 6, or 7 months, and they all include a free treatment. We come out every 11\u201317 days, which lines up with the mosquito life cycle to provide your most consistent experience. Based on your property, it comes out to <strong>$PER_TREATMENT per treatment</strong>. Our most popular is the 6-month plan \u2014 would you prefer coverage for 5, 6, or 7 months?',
            bestFor: 'Homeowners who want great value for peak season \u2014 about 5 months of coverage.',
            details: [
                '<strong>Pay for 9, get 10 applications</strong> (1 FREE spray!)',
                'Biweekly service every 11\u201317 days (matches mosquito life cycle)',
                '5 months of coverage',
                'One upfront payment processed on first service date',
                'Price is locked in \u2014 no surprise charges',
                'Mosquito, tick, and flea protection included',
                'Satisfaction Guarantee \u2014 free retreatments if pest activity occurs between visits',
                'Free first treatment for new clients*'
            ]
        },
        'prepaid_12_biweekly': {
            pitch: 'So this plan gives you 3 coverage options \u2014 5, 6, or 7 months, and they all include a free treatment. We come out every 11\u201317 days, which lines up with the mosquito life cycle to provide your most consistent experience. Based on your property, it comes out to <strong>$PER_TREATMENT per treatment</strong>. Our most popular is the 6-month plan \u2014 would you prefer coverage for 5, 6, or 7 months?',
            bestFor: 'Homeowners who want the best overall value and season-long peace of mind.',
            details: [
                '<strong>Pay for 11, get 12 applications</strong> (1 FREE spray!) \u2014 Most Popular',
                'Biweekly service every 11\u201317 days (matches mosquito life cycle)',
                '6 months of full season coverage',
                'One upfront payment processed on first service date',
                'Price is locked in \u2014 no surprise charges',
                'Mosquito, tick, and flea protection included',
                'Satisfaction Guarantee \u2014 free retreatments if pest activity occurs between visits',
                'Free first treatment for new clients*'
            ]
        },
        'prepaid_14_biweekly': {
            pitch: 'So this plan gives you 3 coverage options \u2014 5, 6, or 7 months, and they all include a free treatment. We come out every 11\u201317 days, which lines up with the mosquito life cycle to provide your most consistent experience. Based on your property, it comes out to <strong>$PER_TREATMENT per treatment</strong>. Our most popular is the 6-month plan \u2014 would you prefer coverage for 5, 6, or 7 months?',
            bestFor: 'Homeowners who want maximum coverage from early spring through late fall \u2014 7 full months.',
            details: [
                '<strong>Pay for 13, get 14 applications</strong> (1 FREE spray!) \u2014 Maximum Coverage',
                'Biweekly service every 11\u201317 days (matches mosquito life cycle)',
                '7 months of coverage \u2014 early spring through late fall',
                'One upfront payment processed on first service date',
                'Price is locked in \u2014 no surprise charges',
                'Mosquito, tick, and flea protection included',
                'Satisfaction Guarantee \u2014 free retreatments if pest activity occurs between visits',
                'Free first treatment for new clients*'
            ]
        },
        'mem_lab_6_triweekly': {
            pitch: 'This is a great option to cover peak activity during summer months. We service your property every 3 weeks, starting the 3rd week of May just before Memorial Day, with the last service completed just after Labor Day. With a one-time payment billed on your first scheduled treatment, the Mosquito Mike Summer Plan is only <strong>$PRICE</strong>.',
            bestFor: 'Pool owners, BBQ hosts, and anyone who lives outdoors during summer.',
            details: [
                '6 triweekly treatments (Memorial Day through Labor Day)',
                'One upfront payment processed on first scheduled treatment',
                'No surprise charges',
                'Mosquito, tick, and flea protection included',
                'Satisfaction Guarantee \u2014 free retreatments if pest activity occurs between visits',
                'Great entry-level package for summer entertaining, graduations, and pool season'
            ]
        },
        'budget_12mo_monthly': {
            pitch: 'This plan is a great alternative to paying each time we come out, or having to pay everything upfront. It allows you to get a full season of tri-weekly treatments and is split into 12 easy payments. To keep them low and predictable, this is a contract-based plan with <strong>ACH accepted as the payment method</strong>. Each payment of <strong>$PRICE</strong> is due on the first of each month, unless you\u2019d prefer a different billing date.',
            bestFor: 'Families who want reliable coverage with predictable monthly payments and no large upfront cost.',
            details: [
                '<strong>Contract-based \u2014 12-month commitment required</strong>',
                'Triweekly treatments from April through mid-October',
                '12 monthly payments via <strong>ACH only</strong> (no credit or debit cards accepted)',
                'Payment due on the 1st of each month (or their preferred billing date)',
                'Mosquito, tick, and flea protection included',
                'Satisfaction Guarantee \u2014 free retreatments if pest activity occurs between visits',
                'Early termination: $495 or cost of remaining months, whichever is less'
            ]
        },
        'event_non_holiday': {
            pitch: 'This is a one-time application designed to mitigate mosquitos, ticks and fleas from your treatment area for the duration of your event. The application comes with a payment of <strong>$PRICE</strong> due the day before your service. If you enjoy the service and want to continue, we can prorate what you paid to a package of your choosing.',
            bestFor: 'Anyone hosting a wedding, party, graduation, or backyard event.',
            details: [
                'Single one-time treatment timed for maximum effectiveness on your event date',
                'Payment due the <strong>day before</strong> service',
                'No ongoing commitment required',
                'Mosquito, tick, and flea protection included',
                'Can prorate payment toward a seasonal package if they want to continue'
            ]
        },
        'event_holiday': {
            pitch: 'This is a one-time application designed to mitigate mosquitos, ticks and fleas from your treatment area for the duration of your event. The application comes with a payment of <strong>$PRICE</strong> due the day before your service. If you enjoy the service and want to continue, we can prorate what you paid to a package of your choosing.',
            bestFor: 'Anyone hosting a holiday gathering or special occasion.',
            details: [
                'Single one-time treatment at <strong>holiday rate</strong>',
                'Payment due the <strong>day before</strong> service',
                'No ongoing commitment required',
                'Mosquito, tick, and flea protection included',
                'Can prorate payment toward a seasonal package if they want to continue'
            ]
        }
    };

    const data = packageData[packageKey] || { pitch: '', bestFor: '', details: [] };

    // Replace $PRICE and $PER_TREATMENT placeholders with actual prices
    const tier = currentTier;
    const traditionalPrice = PRICING_JSON.packages_by_tier[packageKey]?.[tier];
    let priceDisplay = traditionalPrice ? `$${traditionalPrice}` : '$XX';
    if (packageKey.includes('pps')) priceDisplay += '/app';
    else if (packageKey === 'budget_12mo_monthly') priceDisplay += '/mo';

    // Calculate per-treatment price for prepaid packages
    const appCounts = { 'prepaid_10_biweekly': 10, 'prepaid_12_biweekly': 12, 'prepaid_14_biweekly': 14 };
    let perTreatmentDisplay = '$XX';
    if (appCounts[packageKey] && traditionalPrice) {
        perTreatmentDisplay = `$${Math.round(traditionalPrice / appCounts[packageKey])}`;
    }

    const pitch = data.pitch.replace(/\$PER_TREATMENT/g, perTreatmentDisplay).replace(/\$PRICE/g, priceDisplay);

    const contextual = [];

    // Build contextual "Why It Fits" points based on customer answers
    if (answers) {
        if (answers.standing_water === 'yes') {
            contextual.push('Targets mosquito breeding areas \u2014 includes larvicide pucks for standing water');
        }

        if (answers.kids_pets === 'yes') {
            contextual.push('Non-toxic to anything larger than a spider \u2014 safe for kids and pets');
            if (packageKey.includes('prepaid') || packageKey === 'budget_12mo_monthly') {
                contextual.push('Regular treatments keep a consistent safe zone in the yard');
            }
        }

        if (answers.pest_concern === 'both') {
            contextual.push('Dual protection against both mosquitoes AND ticks');
        }

        if (answers.pest_concern === 'ticks' && packageKey === 'pps_triweekly') {
            contextual.push('Triweekly cadence is ideal for tick lifecycle \u2014 while still guaranteeing mosquito and flea coverage');
        }

        if (answers.yard_use === 'summer' && (packageKey.includes('10') || packageKey.includes('mem_lab'))) {
            contextual.push('Lines up perfectly with their summer yard use');
        }

        if (answers.yard_use === 'spring_fall' && (packageKey.includes('12') || packageKey.includes('14') || packageKey === 'budget_12mo_monthly')) {
            contextual.push('Full coverage from early spring through late fall');
        }

        if (answers.payment_preference === 'prepay' && packageKey.includes('prepaid')) {
            contextual.push('Matches their preference for upfront payment with built-in savings');
        }

        if (answers.payment_preference === 'pay_go' && packageKey.includes('pps')) {
            contextual.push('Aligns with their pay-as-you-go preference \u2014 no commitment pressure');
        }

        if (answers.payment_preference === 'budget' && packageKey === 'budget_12mo_monthly') {
            contextual.push('Fits their preference for spreading payments over time');
        }
    }

    return { pitch, bestFor: data.bestFor, details: data.details, contextual };
}

function showAllPackages() {
    const container = document.getElementById('allPackages');
    container.innerHTML = '<h3>All Available Package Options</h3>';
    
    // Get all packages including those not in pricing JSON
    const allPackages = [
        'pps_biweekly',
        'pps_triweekly',
        'pps_monthly',
        'prepaid_10_biweekly',
        'prepaid_12_biweekly', 
        'prepaid_14_biweekly',
        'mem_lab_6_triweekly',
        'budget_12mo_monthly',
        'event_non_holiday',
        'event_holiday'
    ];
    
    allPackages.forEach(pkg => {
        const packageDiv = createPackageCard(pkg, currentTier, null, false, 0);
        container.appendChild(packageDiv);
    });
    
    container.classList.add('show');
    
    // Toggle buttons in fixed bar
    document.getElementById('btnShowAll').style.display = 'none';
    document.getElementById('btnHideAll').style.display = 'block';
}

function hideAllPackages() {
    const container = document.getElementById('allPackages');
    container.classList.remove('show');
    container.innerHTML = ''; // Clear the content
    
    // Toggle buttons in fixed bar
    document.getElementById('btnShowAll').style.display = 'block';
    document.getElementById('btnHideAll').style.display = 'none';
}

function prepareCRMNotes(recommendations, answers, acreage) {
    const date = new Date().toLocaleDateString();
    const tier = currentTier;
    
    // Format yard_use for display
    let yardUseDisplay = answers.yard_use;
    if (answers.yard_use === 'spring_fall') {
        yardUseDisplay = 'spring through fall';
    }
    
    // Format payment_preference for display
    let paymentPrefDisplay = answers.payment_preference;
    if (answers.payment_preference === 'pay_go') {
        paymentPrefDisplay = 'PPS';
    }
    
    let notes = `Date: ${date}\n`;
    notes += `Property Size: ${acreage} acres (${tier})\n`;
    notes += `\nCustomer Profile:\n`;
    notes += `- Pest Concern: ${answers.pest_concern}\n`;
    notes += `- Standing Water: ${answers.standing_water}\n`;
    notes += `- Kids/Pets: ${answers.kids_pets}\n`;
    notes += `- Yard Use: ${yardUseDisplay}\n`;
    notes += `- Payment Preference: ${paymentPrefDisplay}\n`;
    notes += `\nRecommended Packages:\n`;
    
    recommendations.forEach((rec, index) => {
        const packageName = PACKAGE_NAMES[rec.pkg] || rec.pkg;
        const traditionalPrice = PRICING_JSON.packages_by_tier[rec.pkg]?.[tier] || 'N/A';
        const naturalSurcharge = getNaturalSurcharge(rec.pkg);
        const naturalPrice = traditionalPrice !== 'N/A' ? traditionalPrice + naturalSurcharge : 'N/A';
        
        notes += `${index + 1}. ${packageName}\n`;
        notes += `   Traditional: $${traditionalPrice} | Natural: $${naturalPrice}\n`;
    });
    
    return notes;
}

function getNaturalSurcharge(packageKey) {
    if (packageKey === 'pps_biweekly' || packageKey === 'pps_triweekly' || packageKey === 'pps_monthly') {
        return PRICING_JSON.surcharges.natural.pps_per_application;
    } else if (packageKey === 'budget_12mo_monthly') {
        return PRICING_JSON.surcharges.natural.budget_per_month;
    } else if (packageKey === 'prepaid_10_biweekly') {
        return PRICING_JSON.surcharges.natural.prepaid_10_total;
    } else if (packageKey === 'prepaid_12_biweekly') {
        return PRICING_JSON.surcharges.natural.prepaid_12_total;
    } else if (packageKey === 'prepaid_14_biweekly') {
        return PRICING_JSON.surcharges.natural.prepaid_14_total;
    } else if (packageKey === 'mem_lab_6_triweekly') {
        return PRICING_JSON.surcharges.natural.mem_lab_total;
    }
    return 0;
}

function copyCRMNotes() {
    const notes = document.getElementById('crmNotes').textContent;
    navigator.clipboard.writeText(notes).then(() => {
        const btn = document.querySelector('.btn-copy');
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = 'Copy to Clipboard';
            btn.classList.remove('copied');
        }, 2000);
    });
}


function toggleTalkingPoints(element) {
    const h4 = element;
    const ul = h4.nextElementSibling;
    h4.classList.toggle('collapsed');
    ul.classList.toggle('collapsed');
}
function resetCalculator() {
    // Remove showing-results class
    document.body.classList.remove('showing-results');

    // Reset form
    document.getElementById('acreage').value = '';
    document.getElementById('tierDisplay').innerHTML = '';
    currentTier = null;
    pricingOnlyMode = false;

    // Clear radio buttons
    const radios = document.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => radio.checked = false);

    // Reset pricing toggle
    showNaturalPricing = false;
    document.getElementById('pricingToggle').checked = false;
    document.getElementById('toggleLabel').style.color = '#4a5568';
    document.getElementById('toggleLabel').style.fontWeight = '600';

    // Reset all packages display
    document.getElementById('allPackages').classList.remove('show');
    document.getElementById('allPackages').innerHTML = ''; // Clear content
    document.getElementById('btnShowAll').style.display = 'block';
    document.getElementById('btnHideAll').style.display = 'none';

    // Reset pricing-only mode elements
    document.getElementById('btnViewPricing').style.display = 'none';
    document.querySelector('.copy-section').style.display = '';

    // Switch back to questions page
    document.getElementById('page2').classList.remove('active');
    document.getElementById('page1').classList.add('active');

    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleDebug() {
    debugMode = !debugMode;
    const debugElements = document.querySelectorAll('.score-debug');
    debugElements.forEach(el => {
        el.classList.toggle('show', debugMode);
    });
}

function togglePricingMode() {
    showNaturalPricing = document.getElementById('pricingToggle').checked;
    
    // Update the label to show which mode is active
    const label = document.getElementById('toggleLabel');
    if (showNaturalPricing) {
        label.style.color = '#a0a0a0';
        label.style.fontWeight = '500';
    } else {
        label.style.color = '#4a5568';
        label.style.fontWeight = '600';
    }
    
    if (pricingOnlyMode) {
        // In pricing-only mode, just re-render all packages
        viewAllPricing();
        return;
    }

    // Re-render the recommendations with current pricing mode
    const recommendedPackagesContainer = document.getElementById('recommendedPackages');
    if (recommendedPackagesContainer.children.length > 0) {
        const answers = getCurrentAnswers();
        const acreage = parseFloat(document.getElementById('acreage').value);

        // Get recommendations from lookup table
        const recommendations = getRecommendations(answers);

        // Re-display with new pricing mode
        displayResults(recommendations, answers, acreage);
    }

    // Re-render all packages if shown
    const allPackagesContainer = document.getElementById('allPackages');
    if (allPackagesContainer.classList.contains('show')) {
        showAllPackages();
    }
}

function getCurrentAnswers() {
    return {
        pest_concern: document.querySelector('input[name="pest_concern"]:checked')?.value,
        standing_water: document.querySelector('input[name="standing_water"]:checked')?.value,
        kids_pets: document.querySelector('input[name="kids_pets"]:checked')?.value,
        yard_use: document.querySelector('input[name="yard_use"]:checked')?.value,
        payment_preference: document.querySelector('input[name="payment_preference"]:checked')?.value
    };
}
