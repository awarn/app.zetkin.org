import { expect } from '@playwright/test';

import KPD from '../../../mockData/orgs/KPD';
import KPDMembershipSurvey from '../../../mockData/orgs/KPD/surveys/MembershipSurvey';
import RosaLuxemburg from '../../../mockData/orgs/KPD/people/RosaLuxemburg';
import RosaLuxemburgUser from '../../../mockData/users/RosaLuxemburgUser';
import test from '../../../fixtures/next';
import {
  ELEMENT_TYPE,
  RESPONSE_TYPE,
  ZetkinSurveyApiSubmission,
  ZetkinSurveyQuestionElement,
  ZetkinSurveyQuestionResponse,
  ZetkinSurveySignaturePayload,
} from 'utils/types/zetkin';

test.describe('User submitting a survey', () => {
  const apiPostPath = `/orgs/${KPDMembershipSurvey.organization.id}/surveys/${KPDMembershipSurvey.id}/submissions`;

  test.beforeEach(async ({ login, moxy }) => {
    moxy.setZetkinApiMock(
      `/orgs/${KPDMembershipSurvey.organization.id}/surveys/${KPDMembershipSurvey.id}`,
      'get',
      KPDMembershipSurvey
    );

    login(RosaLuxemburgUser, [
      {
        organization: KPD,
        profile: {
          id: RosaLuxemburg.id,
          name: RosaLuxemburg.first_name + ' ' + RosaLuxemburg.last_name,
        },
        role: null,
      },
    ]);
  });

  test.afterEach(({ moxy }) => {
    moxy.teardown();
  });

  test('submits text input', async ({ appUri, moxy, page }) => {
    await page.goto(
      `${appUri}/o/${KPDMembershipSurvey.organization.id}/surveys/${KPDMembershipSurvey.id}`
    );

    await page.fill('[name="2.text"]', 'Topple capitalism');
    await page.click('input[name="sig"][value="anonymous"]');
    await page.click('data-testid=Survey-acceptTerms');
    await Promise.all([
      page.waitForResponse((res) => res.request().method() == 'POST'),
      await page.click('data-testid=Survey-submit'),
    ]);

    const log = moxy.log(`/v1${apiPostPath}`);
    expect(log.length).toBe(1);
    const [request] = log;
    const data = request.data as {
      responses: ZetkinSurveyQuestionResponse[];
    };
    expect(data.responses).toMatchObject([
      {
        question_id: KPDMembershipSurvey.elements[1].id,
        response: 'Topple capitalism',
      },
    ]);
  });

  test('required text input blocks submission when empty', async ({
    appUri,
    moxy,
    page,
  }) => {
    moxy.setZetkinApiMock(
      `/orgs/${KPDMembershipSurvey.organization.id}/surveys/${KPDMembershipSurvey.id}`,
      'get',
      {
        ...KPDMembershipSurvey,
        elements: KPDMembershipSurvey.elements.map((element, i) => {
          if (i === 1) {
            return {
              ...element,
              question: {
                ...(element as ZetkinSurveyQuestionElement).question,
                required: true,
              },
            };
          }
          return element;
        }),
      }
    );

    await page.goto(
      `${appUri}/o/${KPDMembershipSurvey.organization.id}/surveys/${KPDMembershipSurvey.id}`
    );

    moxy.setZetkinApiMock(
      `/orgs/${KPDMembershipSurvey.organization.id}/surveys/${KPDMembershipSurvey.id}/submissions`,
      'post',
      {
        timestamp: '1857-05-07T13:37:00.000Z',
      }
    );

    const requiredTextInput = await page.locator('[name="2.text"][required]');
    await requiredTextInput.waitFor({ state: 'visible' });

    await page.click('input[name="sig"][value="anonymous"]');
    await page.click('data-testid=Survey-acceptTerms');
    await page.click('data-testid=Survey-submit');

    const validationMessage = await requiredTextInput.evaluate((element) => {
      const input = element as HTMLTextAreaElement;
      return input.validationMessage;
    });
    expect(validationMessage).toBe('Please fill in this field.');
  });

  test('submits responses', async ({ appUri, moxy, page }) => {
    await page.goto(
      `${appUri}/o/${KPDMembershipSurvey.organization.id}/surveys/${KPDMembershipSurvey.id}`
    );

    moxy.setZetkinApiMock(
      `/orgs/${KPDMembershipSurvey.organization.id}/surveys/${KPDMembershipSurvey.id}/submissions`,
      'post',
      {
        timestamp: '1857-05-07T13:37:00.000Z',
      }
    );

    await page.click('input[name="1.options"]');
    await page.fill('[name="2.text"]', 'Topple capitalism');
    await page.click('input[name="3.options"][value="1"]');
    await page.click('input[name="3.options"][value="2"]');
    await page.click('input[name="sig"][value="anonymous"]');
    await page.click('data-testid=Survey-acceptTerms');
    await Promise.all([
      page.waitForResponse((res) => res.request().method() == 'POST'),
      await page.click('data-testid=Survey-submit'),
    ]);

    const log = moxy.log(`/v1${apiPostPath}`);
    expect(log.length).toBe(1);
    const [request] = log;
    const data = request.data as {
      responses: ZetkinSurveyQuestionResponse[];
    };
    expect(data.responses.length).toBe(3);
    expect(data.responses).toMatchObject([
      {
        options: [1],
        question_id: KPDMembershipSurvey.elements[0].id,
      },
      {
        question_id: KPDMembershipSurvey.elements[1].id,
        response: 'Topple capitalism',
      },
      {
        options: [1, 2],
        question_id: KPDMembershipSurvey.elements[2].id,
      },
    ]);
  });

  test('submits email signature', async ({ appUri, moxy, page }) => {
    await page.goto(
      `${appUri}/o/${KPDMembershipSurvey.organization.id}/surveys/${KPDMembershipSurvey.id}`
    );

    moxy.setZetkinApiMock(
      `/orgs/${KPDMembershipSurvey.organization.id}/surveys/${KPDMembershipSurvey.id}/submissions`,
      'post',
      {
        timestamp: '1857-05-07T13:37:00.000Z',
      }
    );

    await page.click('input[name="1.options"]');
    await page.fill('[name="2.text"]', 'Topple capitalism');
    await page.click('input[name="sig"][value="email"]');
    await page.fill('input[name="sig.email"]', 'testuser@example.org');
    await page.fill('input[name="sig.first_name"]', 'Test');
    await page.fill('input[name="sig.last_name"]', 'User');
    await page.click('data-testid=Survey-acceptTerms');
    await Promise.all([
      page.waitForResponse((res) => res.request().method() == 'POST'),
      await page.click('data-testid=Survey-submit'),
    ]);

    const log = moxy.log(`/v1${apiPostPath}`);
    expect(log.length).toBe(1);
    const [request] = log;
    const data = request.data as {
      signature: ZetkinSurveySignaturePayload;
    };
    expect(data.signature).toMatchObject({
      email: 'testuser@example.org',
      first_name: 'Test',
      last_name: 'User',
    });
  });

  test('submits user signature', async ({ appUri, moxy, page }) => {
    await page.goto(
      `${appUri}/o/${KPDMembershipSurvey.organization.id}/surveys/${KPDMembershipSurvey.id}`
    );

    moxy.setZetkinApiMock(
      `/orgs/${KPDMembershipSurvey.organization.id}/surveys/${KPDMembershipSurvey.id}/submissions`,
      'post',
      {
        timestamp: '1857-05-07T13:37:00.000Z',
      }
    );

    await page.click('input[name="1.options"][value="1"]');
    await page.fill('[name="2.text"]', 'Topple capitalism');
    await page.click('input[name="sig"][value="user"]');
    await page.click('data-testid=Survey-acceptTerms');
    await Promise.all([
      page.waitForResponse((res) => res.request().method() == 'POST'),
      await page.click('data-testid=Survey-submit'),
    ]);

    const log = moxy.log(`/v1${apiPostPath}`);
    expect(log.length).toBe(1);
    const [request] = log;
    const data = request.data as {
      signature: ZetkinSurveySignaturePayload;
    };
    expect(data.signature).toBe('user');
  });

  test('submits anonymous signature', async ({ appUri, moxy, page }) => {
    await page.goto(
      `${appUri}/o/${KPDMembershipSurvey.organization.id}/surveys/${KPDMembershipSurvey.id}`
    );

    moxy.setZetkinApiMock(
      `/orgs/${KPDMembershipSurvey.organization.id}/surveys/${KPDMembershipSurvey.id}/submissions`,
      'post',
      {
        timestamp: '1857-05-07T13:37:00.000Z',
      }
    );

    await page.click('input[name="1.options"][value="1"]');
    await page.fill('[name="2.text"]', 'Topple capitalism');
    await page.click('input[name="sig"][value="anonymous"]');
    await page.click('data-testid=Survey-acceptTerms');
    await Promise.all([
      page.waitForResponse((res) => res.request().method() == 'POST'),
      await page.click('data-testid=Survey-submit'),
    ]);

    const log = moxy.log(`/v1${apiPostPath}`);
    expect(log.length).toBe(1);
    const [request] = log;
    const data = request.data as {
      signature: ZetkinSurveySignaturePayload;
    };
    expect(data.signature).toBe(null);
  });

  test('submits untouched "select" widget as []', async ({
    appUri,
    moxy,
    page,
  }) => {
    // Include a select-widget element in the survey
    moxy.setZetkinApiMock(
      `/orgs/${KPDMembershipSurvey.organization.id}/surveys/${KPDMembershipSurvey.id}`,
      'get',
      {
        ...KPDMembershipSurvey,
        elements: [
          ...KPDMembershipSurvey.elements,
          {
            hidden: false,
            id: 3,
            question: {
              description: '',
              options: [
                {
                  id: 1,
                  text: 'Yes',
                },
                {
                  id: 2,
                  text: 'No',
                },
              ],
              question: 'Is this a select box?',
              required: false,
              response_config: {
                widget_type: 'select',
              },
              response_type: RESPONSE_TYPE.OPTIONS,
            },
            type: ELEMENT_TYPE.QUESTION,
          },
        ],
      }
    );

    // Respond when survey is submitted
    moxy.setZetkinApiMock(
      `/orgs/${KPDMembershipSurvey.organization.id}/surveys/${KPDMembershipSurvey.id}/submissions`,
      'post',
      {
        timestamp: '1857-05-07T13:37:00.000Z',
      }
    );

    // Navigate to survey and submit without touching the select widget (or any)
    await page.goto(
      `${appUri}/o/${KPDMembershipSurvey.organization.id}/surveys/${KPDMembershipSurvey.id}`
    );
    await page.click('input[name="sig"][value="anonymous"]');
    await page.click('data-testid=Survey-acceptTerms');
    await Promise.all([
      page.waitForResponse((res) => res.request().method() == 'POST'),
      await page.click('data-testid=Survey-submit'),
    ]);

    const log = moxy.log(`/v1${apiPostPath}`);
    expect(log.length).toBe(1);

    const data = log[0].data as ZetkinSurveyApiSubmission;
    expect(data).toEqual({
      responses: [
        {
          question_id: 2,
          response: '',
        },
        {
          options: [],
          question_id: 3,
        },
      ],
      signature: null,
    });
  });

  test('preserves inputs on error', async ({ appUri, page }) => {
    await page.goto(
      `${appUri}/o/${KPDMembershipSurvey.organization.id}/surveys/${KPDMembershipSurvey.id}`
    );

    await page.click('input[name="1.options"][value="1"]');
    await page.fill('[name="2.text"]', 'Topple capitalism');
    await page.click('input[name="sig"][value="anonymous"]');
    await page.click('data-testid=Survey-acceptTerms');

    await Promise.all([
      page.waitForResponse((res) => res.request().method() == 'POST'),
      await page.click('data-testid=Survey-submit'),
    ]);

    await expect(page.locator('data-testid=Survey-error')).toBeVisible();
    await expect(
      page.locator('input[name="1.options"][value="1"]')
    ).toBeChecked();
    await expect(page.locator('[name="2.text"]')).toHaveValue(
      'Topple capitalism'
    );
    await expect(
      page.locator('input[name="sig"][value="anonymous"]')
    ).toBeChecked();
    await expect(page.locator('data-testid=Survey-acceptTerms')).toBeChecked();
  });
});
