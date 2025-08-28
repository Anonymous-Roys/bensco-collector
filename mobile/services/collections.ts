import { Alert } from 'react-native';
import { AppDispatch } from '@/store';
import { createContribution } from '@/store/slices/contributionSlice';

export interface ContributionPayload {
  client: string;
  collector: string;
  amount: string;
  savings_cycle?: string;
  date?: string;
  note?: string;
  days_covered?: number;
}

export async function confirmAndCreateContribution(
  dispatch: AppDispatch,
  payload: ContributionPayload,
  options?: { confirm?: boolean; confirmTitle?: string; confirmMessage?: string }
): Promise<boolean> {
  const { confirm = true, confirmTitle = 'Confirm Collection', confirmMessage = `Do you want to add this collection to the database?` } = options || {};

  let shouldProceed = true;

  if (confirm) {
    shouldProceed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        confirmTitle,
        confirmMessage,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Yes', style: 'default', onPress: () => resolve(true) },
        ],
        { cancelable: true }
      );
    });
  }

  if (!shouldProceed) return false;

  await dispatch(createContribution(payload) as any);
  return true;
}


