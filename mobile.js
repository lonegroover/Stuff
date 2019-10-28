const axios = require('axios');

const defaultConfig = {
  client_id : `3MVG91LYYD8O4krQ6I.yTwvwPANX0ywUeD0oGAM0vnJF15.XUK0BEeC7Ogg5juRb0wBoBp78lIwT6sBt3AEls`,
  refreshToken : `5Aep861fPbvNTL_1vu3ZaNSPGXoqLoLFEhqozR29UMy6TKoZRdQGyvOqA4NiFpDTDxPBjrUc3WLJfCTx7vPfjxC`,
  idpDomain : `https://buk-b2b--MiloR2Dev1.cs110.my.salesforce.com`,
//  spDomain : `https://buk-b2b--MiloR2Dev2.cs110.my.salesforce.com`, // Org domain
  spDomain : `https://milor2dev2-barclaysbizuk.cs110.my.salesforce.com`, // Community domain
  tokenEndpoint : `/services/oauth2/token`,
  apexEndpoint : `/services/apexrest`,
  emailDomain : `@email.com`,
  query : encodeURIComponent(`select username from user where isactive=true`),
}

async function authFlow({lastname, csid, username, config=defaultConfig}) {
  const { client_id, refreshToken, idpDomain, spDomain, tokenEndpoint, apexEndpoint, emailDomain, query} = config;
//  const username = `${lastname}${emailDomain}`
  const jwtServiceURL = `${idpDomain}${apexEndpoint}/JWTService?username=${username}&lastname=${lastname}&csid=${csid}`
  const userRegistrationServiceURL = `${spDomain}${apexEndpoint}/UserRegistrationService`
  const authURL = `${spDomain}${tokenEndpoint}?grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`
  const apiURL = `${spDomain}/services/data/v46.0/query?q=${query}`
  
  // Get access token from IDP
  const refreshTokenFlowResponse = await axios.post(`${idpDomain}${tokenEndpoint}?grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${client_id}`
    ).catch(error => {
      console.log('ERROR: POST: Refresh Token: ', error.response.status, ' (', error.response.statusText, ')')
      console.log('ERROR: POST: Refresh Token: ', error.response.data)
    })

  const idp_access_token = refreshTokenFlowResponse.data.access_token;
  console.log('LOG: idp_access_token: ', idp_access_token)

  // Get JWT with IUD token from IDP
  const JWTGenerationResponse = await axios.get(jwtServiceURL,{ // Generate JWT with ID Token
      headers: {
        'Authorization': `Bearer ${idp_access_token}`,
        'Content-Type': 'application/json',
      }
    }).catch(error => {
      console.log('ERROR: GET: JWT: Status: ', error.response.status, ' (', error.response.statusText, ')')
      console.log('ERROR: GET: JWT: Data: ', error.response.data)
      })
  const JWT = JWTGenerationResponse.data;
  console.log('LOG: JWT (base64):', JWT)
  console.log('LOG: JWT:',base64Decode(JWT))
  

  // Use Bearer Token flow to get access token from SP
  let JWTBearerTokenFlowReponse = '';
  try {
    console.log(`DEBUG: WTBearerTokenFlow: axios.post(${authURL}&assertion=${JWT}`)
    JWTBearerTokenFlowReponse = await axios.post(`${authURL}&assertion=${JWT}`);
    console.log('LOG: JWTBearerTokenFlowReponse: ',JWTBearerTokenFlowReponse.data)
  } catch (err) {
    console.log('LOG: JWTBearerTokenFlowReponse status code: ',err.response.status)
    console.log('LOG: JWTBearerTokenFlowReponse error code: ',err.response.data)
    if(err.response.data.error==='invalid_grant') {
      try {
        console.log(`DEBUG: UserCreated: axios.post(${userRegistrationServiceURL}?token=${JWT}`)
        const userCreatedResponse = await axios.post(`${userRegistrationServiceURL}?token=${JWT}`)
        console.log('LOG: userCreatedResponse: ',userCreatedResponse)
        JWTBearerTokenFlowReponse = await axios.post(`${authURL}&assertion=${JWT}`);
        console.log('LOG: JWTBearerTokenFlowReponse: ',response.data)
      } catch (err) {
        if(err.response) {
          console.log('LOG: userCreatedResponse status code: ',err.response.status)
          console.log('LOG: userCreatedResponse error code: ',err.response.data)
        }
      }
    }
  } finally {
    const APICallResponse = await axios.get(apiURL,{ // Example API call
      headers: {
        'Authorization': `Bearer ${JWTBearerTokenFlowReponse.data.access_token}`,
        'Content-Type': 'application/json',
      }
    }).catch(error => {
      console.log('ERROR: GET: API Call: Status: ', error.response.status, ' (', error.response.statusText, ')')
      console.log('ERROR: GET: API Call: Data: ', error.response.data)
      })
    console.log('LOG: APICallResponse: ',APICallResponse.data)
  }
}

function base64Decode(data) {
  const buff = Buffer.from(data.split('.')[1], 'base64')
  console.log('LOG: JWT Header(base64Decode): ', JSON.parse(Buffer.from(data.split('.')[0], 'base64').toString('utf-8')))
  const jwtbody = buff.toString('utf-8');
  return JSON.parse(jwtbody);
}

// authFlow({lastname:'Smith', csid:'12345'});
authFlow({lastname:'Sands', csid:'12345', username:'richard.sands@barclays.com.milor2dev2'});
