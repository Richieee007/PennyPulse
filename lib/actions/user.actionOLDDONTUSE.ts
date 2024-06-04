'use server';
import { cookies } from "next/headers";
import { createAdminClient, createSessionClient} from "../appwrite";
import { ID, Query } from "node-appwrite";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";
import { plaidClient } from "@/lib/plaid";
import { revalidatePath } from "next/cache";
import { createDwollaCustomer } from "./dwolla.actions";
import { addFundingSource } from "./dwolla.actions";
import { getUserInfo } from "./user.actions";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
  APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env;

export const signIn = async ({email, password}: signInProps) =>{
    try{
      const { account } = await createAdminClient();
      const response = await account.createEmailPasswordSession(email, password);

      cookies().set("appwrite-session", response.secret, {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: true,
      });


      return parseStringify(response);
    }catch(error){
            console.error('Error', error);
        }
    }


    export const signUp = async ({ password, ...userData}: SignUpParams) =>{

        const {email, firstName, lastName} = userData;

        const ssn = '1234';
        const postalCode = '12345';
        const state = 'TX';

        let newUserAccount;

        try{
            const { account, database } = await createAdminClient();

        newUserAccount = await account.create(
    
    ID.unique(), 
    email,
    password, 
    `${firstName} ${lastName}`
    );

    if(!newUserAccount) throw new Error('Error Creating User')

      const dwollaCustomerUrl = await createDwollaCustomer({

        ...userData,
        //based in UK so dont have SSN or STATE or POSTALCODE in same format. so static ones for
        // all users
        type: 'personal',
        ssn: '1234',
        state: 'TX',
        postalCode: '12345',
      
      })

      if(!dwollaCustomerUrl) throw new Error('Error Creating UserDwolla')

        const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

        const newUser = await database.createDocument(
          DATABASE_ID!,
          USER_COLLECTION_ID!,
          ID.unique(),
          {
            ...userData,
            userId: newUserAccount.$id,
            dwollaCustomerId,
            dwollaCustomerUrl,
            firstName,
            lastName,
          }
        )

  const session = await account.createEmailPasswordSession(email, password);

  cookies().set("appwrite-session", session.secret, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: true,
  });

  return parseStringify(newUser);
  
        }catch(error){
                console.error('Error', error);
            }
        }


export async function getLoggedInUser() {
    try {
      const { account } = await createSessionClient();

      const result = await account.get();

      const user = await getUserInfo({userId: result.$id})

      return parseStringify(user);

;    } catch (error) {
        console.log(error)
      return null;
    }
  }

  export const logoutAccount = async () =>{
    try{

      const { account } = await createAdminClient();

      cookies().delete('appwrite-session');

      await account.deleteSession('current');

    } catch (error){
      return null;
    }
  }

  export const createLinkToken = async (user: User) => {

    try{

      const tokenParams = {

        user: {
          client_user_id: user.$id
        },
        client_name: `${user.firstName} ${user.lastName}`,
        products: ['auth'] as Products[],
        language: 'en',
        country_codes: ['US'] as CountryCode[],
      }

      const response = await plaidClient.linkTokenCreate(tokenParams);

      return parseStringify({ linkToken: response.data.link_token})


    } catch (error) {

      console.log(error);
    }



  }

  export const createBankAccount = async ({

    userId,
    bankId,
    accountId,
    accessToken,
    fundingSourceUrl,
    shareableId,

  }: createBankAccountProps) => {
    try {
      const { database } = await createAdminClient();
      const bankAccount = await database.createDocument(
        DATABASE_ID!,
        BANK_COLLECTION_ID!,
        ID.unique(),
        {
          userId,
          bankId,
          accountId,
          accessToken,
          fundingSourceUrl,
          shareableId,
        }
      )

      return parseStringify(bankAccount);
      
    } catch (error) {
      
    }
  }

  
 // This function exchanges a public token for an access token and item ID
export const exchangePublicToken = async ({
  publicToken,
  user,
}: exchangePublicTokenProps) => {
  try {
    // Exchange public token for access token and item ID
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Get account information from Plaid using the access token
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accountData = accountsResponse.data.accounts[0];

    // Create a processor token for Dwolla using the access token and account ID
    const request: ProcessorTokenCreateRequest = {
      access_token: accessToken,
      account_id: accountData.account_id,
      processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
    };

    const processorTokenResponse =
      await plaidClient.processorTokenCreate(request);
    const processorToken = processorTokenResponse.data.processor_token;

    // Create a funding source URL for the account using the Dwolla customer ID, processor token, and bank name
    const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId,
      processorToken,
      bankName: accountData.name,
    });

    // If the funding source URL is not created, throw an error
    if (!fundingSourceUrl) throw Error;

    // Create a bank account using the user ID, item ID, account ID, access token, funding source URL, and shareable ID
    await createBankAccount({
      userId: user.$id,
      bankId: itemId,
      accountId: accountData.account_id,
      accessToken,
      fundingSourceUrl,
      shareableId: encryptId(accountData.account_id),
    });

    // Revalidate the path to reflect the changes
    revalidatePath("/");

    // Return a success message
    return parseStringify({
      publicTokenExchange: "complete",
    });
  } catch (error) {
    // Log any errors that occur during the process
    console.error("An error occurred while creating exchanging token:", error);
  }
};






