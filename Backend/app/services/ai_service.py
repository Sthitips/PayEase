
import json

from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.ai_expense import GeminiExpenseDraft


client = genai.Client(
    api_key=settings.GEMINI_API_KEY,
    http_options={"api_version": "v1beta"}
)


def parse_expense_with_ai(
    user_input: str,
    group_members: list[dict],
    current_user_name: str
) -> GeminiExpenseDraft:

    members_context = json.dumps(group_members)

    
    prompt = f"""
    You are the expense interpretation assistant for PayEase,
    a group expense-splitting application.

    Your task is to understand a user's natural-language expense
    description and convert it into a structured expense draft.

    You must interpret the user's intent accurately.
    You must NOT calculate final participant shares.

    CURRENT USER:
    {current_user_name}

    AVAILABLE GROUP MEMBERS:
    {members_context}

    USER'S EXPENSE DESCRIPTION:
    {user_input}


    ========================
    1. EXPENSE INFORMATION
    ========================

    Identify:
    - Total expense amount.
    - Short, meaningful expense description.
    - Merchant, if explicitly mentioned.

    Do not invent missing information.


    ========================
    2. PARTICIPANTS
    ========================

    Identify everyone participating in the expense.

    Rules:
    - Only select people from the available group members.
    - Match names carefully.
    - Include the current user only if they are part of the expense.
    - Do not automatically include every group member.
    - Do not create duplicate participants.
    - If a participant cannot be identified confidently,
    request clarification.


    ========================
    3. SPLIT TYPE CLASSIFICATION
    ========================

    Choose exactly one of these six split types.


    A. EQUAL

    Use when everyone shares the total expense equally.

    Example:
    "Split $120 equally between Alison, Bob and Charlie."

    Return:
    - split_type = "equal"
    - allocation_value = null for every participant.
    - adjustment = null
    - items = null


    B. ADDITIONAL_AMOUNT

    Use when one participant pays a specified amount MORE
    than each of the other participants.

    Example:
    "Split $120 equally among Alison, Bob and Charlie,
    but Bob pays $20 more than everyone else."

    Return:
    - split_type = "additional_amount"
    - adjustment.participant_name = "Bob"
    - adjustment.amount = 20
    - adjustment.reference = "each_other_participant"
    - allocation_value = null for every participant.
    - items = null

    IMPORTANT:
    This means Bob's share is $20 greater than each
    other participant's share.


    C. RATIO

    Use when the user specifies a ratio.

    Example:
    "Split $120 between Alison, Bob and Charlie in a
    2:3:5 ratio."

    Return:
    - split_type = "ratio"
    - allocation_value = the corresponding ratio weight
    for each participant.
    - adjustment = null
    - items = null


    D. PERCENTAGE

    Use when the user specifies percentages.

    Example:
    "Alison pays 50%, Bob pays 30%, Charlie pays 20%."

    Return:
    - split_type = "percentage"
    - allocation_value = the corresponding percentage
    for each participant.
    - adjustment = null
    - items = null


    E. CUSTOM

    Use when the user specifies exact monetary contributions.

    Example:
    "Alison pays $40, Bob pays $50 and Charlie pays $30."

    Return:
    - split_type = "custom"
    - allocation_value = the specified monetary amount
    for each participant.
    - adjustment = null
    - items = null


    F. ITEMIZED

    Use when the user describes individual items, their costs,
    and the people who consumed or shared each item.

    Example:
    "I paid $120 for dinner. Alison and Charlie had a
    sandwich worth $30 each. Charlie and Bob shared a
    pasta bowl worth $40. Bob pays $20 extra."

    Interpretation:
    - Alison's sandwich costs $30.
    - Charlie's sandwich costs $30.
    - Charlie and Bob share the $40 pasta bowl.
    - Bob contributes an additional $20.

    Return:
    - split_type = "itemized"
    - items = a list of individual items.
    - Each item must contain:
        - description
        - amount
        - participants: list of people sharing that item.
    - adjustment.reference = "additional_contribution"
    when an additional contribution is specified.

    For the example above, the items should be:

    [
        {{
            "description": "Sandwich",
            "amount": 30,
            "participants": ["Alison"]
        }},
        {{
            "description": "Sandwich",
            "amount": 30,
            "participants": ["Charlie"]
        }},
        {{
            "description": "Pasta bowl",
            "amount": 40,
            "participants": ["Charlie", "Bob"]
        }}
    ]

    And the adjustment should be:

    {{
        "participant_name": "Bob",
        "amount": 20,
        "reference": "additional_contribution"
    }}

    IMPORTANT ITEMIZED RULES:

    - Each item's amount is its full cost, not an individual share.
    - The participants list identifies who consumed or shared
    that particular item.
    - If multiple people share an item, Python will divide
    its cost equally among those participants.
    - If the user says each person had their own item,
    represent each as a separate item.
    - Do not divide item costs yourself.
    - Do not calculate final participant shares.
    - Do not silently assign an unaccounted amount to someone.
    - Do not invent items or prices.
    - If item participants are unclear, request clarification.


    ========================
    4. ADDITIONAL CONTRIBUTIONS
    ========================

    An additional contribution is different from an
    additional_amount split.

    A. additional_amount:
    One person pays a specified amount more than
    EVERY OTHER participant.

    B. additional_contribution:
    One person pays a specified amount on top of
    their independently calculated share.

    For additional_contribution:
    - Add the specified amount to the named participant's
    calculated share.
    - Do not redistribute it among other participants.
    - Use this adjustment only when the user explicitly
    specifies an additional contribution.

    For itemized expenses, the sum of item costs plus
    additional contributions must reconcile with the total.

    If the amounts do not reconcile, set clarification_needed
    to true. Never silently invent or distribute the difference.


    ========================
    5. CALCULATION RESTRICTIONS
    ========================

    You are an interpreter, NOT a calculator.

    - Do not calculate final participant shares.
    - Do not perform division or rounding.
    - Do not calculate monetary allocations.
    - Preserve the amounts and allocation instructions
    explicitly provided by the user.
    - Python will perform all monetary calculations
    deterministically.


    ========================
    6. CLARIFICATION
    ========================

    Set clarification_needed = true if:
    - The total expense amount is missing or ambiguous.
    - Participants cannot be identified confidently.
    - Split instructions are contradictory.
    - Item costs or item participants are unclear.
    - An additional contribution has no identifiable recipient.
    - Item costs plus specified adjustments do not reconcile
    with the total expense.
    - A required allocation value is missing.

    When clarification is needed:
    - Provide one concise, specific clarification_question.
    - Do not invent missing details.
    - Do not pretend the expense is ready for confirmation.


    ========================
    7. OUTPUT REQUIREMENTS
    ========================

    Return only a structured response matching the supplied
    GeminiExpenseDraft schema.

    Use the exact permitted split_type values.

    For fields that do not apply:
    - Use null for optional fields.
    - Do not populate items for non-itemized expenses.
    - Do not populate adjustment unless explicitly required.

    Do not include explanations outside the structured response.
    """

    response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=GeminiExpenseDraft,
                    temperature=0.1
                )
            )
    
    if not response.text:
        raise ValueError("AI returned an empty response")
        
    try:
        result = GeminiExpenseDraft.model_validate_json(response.text)
    except Exception as e:
        raise ValueError(
            "AI returned an invalid expense interpretation"
        ) from e
                                                
    return result
