// src/services/insuranceProvider.ts
/**
 * Service for managing insurance provider and network status data
 */

import { supabase } from '../lib/supabaseClient';

export interface InsuranceProvider {
  id?: string;
  name: string;
  fee_schedule: string;
  portal_status: string;
  eft_status: string;
  dr_patel_network: string;
  dr_novak_network: string;
  dr_chen_network: string;
}

export interface InsuranceStats {
  totalProviders: number;
  inNetworkProviders: number;
  outOfNetworkProviders: number;
  partiallyInNetwork: number;
  activePlans: number;
  totalPortals: number;
  eftEnrolled: number;
  connectionNetwork: number;
  directContracts: number;
  decareContracts: number;
}

/**
 * Fetch all insurance providers from Supabase
 */
export async function getInsuranceProviders(): Promise<InsuranceProvider[]> {
  try {
    const { data, error } = await supabase
      .from('insurance_providers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching insurance providers:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getInsuranceProviders:', err);
    return [];
  }
}

/**
 * Calculate insurance statistics from provider data
 * A provider is "in network" only if ALL doctors are "In"
 */
export function calculateInsuranceStats(providers: InsuranceProvider[]): InsuranceStats {
  const stats: InsuranceStats = {
    totalProviders: providers.length,
    inNetworkProviders: 0,
    outOfNetworkProviders: 0,
    partiallyInNetwork: 0,
    activePlans: 0,
    totalPortals: 0,
    eftEnrolled: 0,
    connectionNetwork: 0,
    directContracts: 0,
    decareContracts: 0
  };

  providers.forEach(provider => {
    // Count network status
    const drPatelIn = provider.dr_patel_network === 'In';
    const drNovakIn = provider.dr_novak_network === 'In';
    const drChenIn = provider.dr_chen_network === 'In';

    const inNetworkCount = [drPatelIn, drNovakIn, drChenIn].filter(Boolean).length;

    if (inNetworkCount === 3) {
      // All doctors in network
      stats.inNetworkProviders++;
    } else if (inNetworkCount === 0) {
      // All doctors out of network
      stats.outOfNetworkProviders++;
    } else {
      // Some doctors in, some out
      stats.partiallyInNetwork++;
    }

    // Count active plans (portal status "All Set!")
    if (provider.portal_status === 'All Set!') {
      stats.activePlans++;
      stats.totalPortals++;
    }

    // Count EFT enrolled
    if (provider.eft_status === 'Enrolled') {
      stats.eftEnrolled++;
    }

    // Count by fee schedule
    if (provider.fee_schedule === 'Connection') {
      stats.connectionNetwork++;
    } else if (provider.fee_schedule === 'Direct') {
      stats.directContracts++;
    } else if (provider.fee_schedule === 'Decare') {
      stats.decareContracts++;
    }
  });

  return stats;
}

/**
 * Upsert an insurance provider
 */
export async function upsertInsuranceProvider(provider: InsuranceProvider): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('insurance_providers')
      .upsert({
        id: provider.id,
        name: provider.name,
        fee_schedule: provider.fee_schedule,
        portal_status: provider.portal_status,
        eft_status: provider.eft_status,
        dr_patel_network: provider.dr_patel_network,
        dr_novak_network: provider.dr_novak_network,
        dr_chen_network: provider.dr_chen_network,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (error) {
      console.error('Error upserting insurance provider:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in upsertInsuranceProvider:', err);
    return false;
  }
}

/**
 * Initialize insurance providers table with default data
 */
export async function initializeInsuranceProviders(): Promise<boolean> {
  try {
    const defaultProviders: Omit<InsuranceProvider, 'id'>[] = [
      {
        name: 'Aetna',
        fee_schedule: 'Direct',
        portal_status: 'All Set!',
        eft_status: 'Enrolled',
        dr_patel_network: 'In',
        dr_novak_network: 'In',
        dr_chen_network: 'In'
      },
      {
        name: 'Cigna',
        fee_schedule: 'Connection',
        portal_status: 'All Set!',
        eft_status: 'Enrolled',
        dr_patel_network: 'In',
        dr_novak_network: 'In',
        dr_chen_network: 'In'
      },
      {
        name: 'Delta Dental Insurance',
        fee_schedule: 'Direct',
        portal_status: 'All Set!',
        eft_status: 'Enrolled',
        dr_patel_network: 'Out',
        dr_novak_network: 'Out',
        dr_chen_network: 'Out'
      },
      {
        name: 'MetLife',
        fee_schedule: 'Connection',
        portal_status: 'All Set!',
        eft_status: 'Enrolled',
        dr_patel_network: 'In',
        dr_novak_network: 'In',
        dr_chen_network: 'In'
      },
      {
        name: 'Anthem BCBS',
        fee_schedule: 'Decare',
        portal_status: 'All Set!',
        eft_status: 'Enrolled',
        dr_patel_network: 'In',
        dr_novak_network: 'In',
        dr_chen_network: 'In'
      },
      {
        name: 'United Healthcare (Optum ID)',
        fee_schedule: 'Connection',
        portal_status: 'All Set!',
        eft_status: 'Enrolled',
        dr_patel_network: 'Out',
        dr_novak_network: 'Out',
        dr_chen_network: 'Out'
      },
      {
        name: 'Guardian',
        fee_schedule: 'Connection',
        portal_status: 'All Set!',
        eft_status: 'Enrolled',
        dr_patel_network: 'Out',
        dr_novak_network: 'Out',
        dr_chen_network: 'Out'
      },
      {
        name: 'Humana',
        fee_schedule: 'Direct',
        portal_status: 'All Set!',
        eft_status: 'Enrolled',
        dr_patel_network: 'In',
        dr_novak_network: 'In',
        dr_chen_network: 'In'
      },
      {
        name: 'Ameritas',
        fee_schedule: 'Direct',
        portal_status: 'All Set!',
        eft_status: 'Enrolled',
        dr_patel_network: 'In',
        dr_novak_network: 'In',
        dr_chen_network: 'In'
      },
      {
        name: 'Principal',
        fee_schedule: 'Direct',
        portal_status: 'All Set!',
        eft_status: 'Enrolled',
        dr_patel_network: 'In',
        dr_novak_network: 'In',
        dr_chen_network: 'In'
      },
      {
        name: 'Beam Benefits',
        fee_schedule: 'Direct',
        portal_status: 'All Set!',
        eft_status: 'Enrolled',
        dr_patel_network: 'In',
        dr_novak_network: 'In',
        dr_chen_network: 'In'
      }
    ];

    const { error } = await supabase
      .from('insurance_providers')
      .upsert(defaultProviders);

    if (error) {
      console.error('Error initializing insurance providers:', error);
      return false;
    }

    console.log('Insurance providers initialized successfully');
    return true;
  } catch (err) {
    console.error('Error in initializeInsuranceProviders:', err);
    return false;
  }
}
