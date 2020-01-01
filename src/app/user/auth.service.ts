import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs/Subject';

import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';


import { User } from './user.model';

/////
import {CognitoUserPool, CognitoUserAttribute, CognitoUser, AuthenticationDetails, CognitoUserSession} from 'amazon-cognito-identity-js';
const POOL_DATA = {
  UserPoolId:'ca-central-1_cm5A4xFeT',
  ClientId:'1h90lgf18gtnbcg4nc5js6fun8'
};
const userPool = new CognitoUserPool(POOL_DATA);
/////

@Injectable()
export class AuthService {
  authIsLoading = new BehaviorSubject<boolean>(false);
  authDidFail = new BehaviorSubject<boolean>(false);
  authStatusChanged = new Subject<boolean>();

  ////
  registeredUser:CognitoUser;
  ////

  constructor(private router: Router) {}

  /////
  signUp(username: string, email: string, password: string): void {
    this.authIsLoading.next(true);
    // get the user
    const user: User = {
      username: username,
      email: email,
      password: password
    };
    // provide attribute
    const emailAttribute = {
      Name: 'email',
      Value: user.email
    };
    const attrList:CognitoUserAttribute[] = [];
    attrList.push(new CognitoUserAttribute(emailAttribute));
    ///// signup the user
    userPool.signUp(user.username, user.password, attrList, null, (err, result)=>{
      if(err){this.authDidFail.next(true);this.authIsLoading.next(false);return;}
      else{this.authDidFail.next(false); this.authIsLoading.next(false);this.registeredUser = result.user;}
    });
    return;
  }
  //////

  ////////
  confirmUser(username: string, code: string) {
    this.authIsLoading.next(true);
    const userData = {
      Username: username,
      Pool: userPool
    };
    const cognitoUser = new CognitoUser(userData);
    cognitoUser.confirmRegistration(code, true, (err, result)=>{
      if(err){this.authIsLoading.next(false);this.authDidFail.next(true);return;}
      else{this.authDidFail.next(false); this.authIsLoading.next(false);this.router.navigate(['/']);return;}
    });
  }
  ///////


  ///////
  signIn(username: string, password: string): void {
    this.authIsLoading.next(true);
    const authData = {
      Username: username,
      Password: password
    };
    const authDetails = new AuthenticationDetails(authData);
    const userData = {Username:username, Pool:userPool};
    const cognitoUser = new CognitoUser(userData);
    const that = this;

    cognitoUser.authenticateUser(authDetails, {
      onFailure(result:CognitoUserSession)
      {that.authStatusChanged.next(true);that.authDidFail.next(false);that.authIsLoading.next(false);console.log(result);},
      onSuccess(err)
      {that.authDidFail.next(true);that.authIsLoading.next(false);console.log(err);}
    });

    this.authStatusChanged.next(true);
    return;
  }
  ///////



  getAuthenticatedUser() {
    return userPool.getCurrentUser();
  }
  logout() {
    this.getAuthenticatedUser().signOut();
    this.authStatusChanged.next(false);
  }
  isAuthenticated(): Observable<boolean> {
    const user = this.getAuthenticatedUser();
    const obs = Observable.create((observer) => {
      if (!user) {
        observer.next(false);
      } else {
        user.getSession((err, session)=>{
          if(err){observer.next(false);}
          else{
            if(session.isValid()){observer.next(true);}
            else{observer.next(false);}
          }
        })
      }
      observer.complete();
    });
    return obs;
  }
  initAuth() {
    this.isAuthenticated().subscribe(
      (auth) => this.authStatusChanged.next(auth)
    );
  }
}
