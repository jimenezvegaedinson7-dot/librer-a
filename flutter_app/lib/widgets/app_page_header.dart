import 'package:flutter/material.dart';

class AppPageHeader extends StatelessWidget {
  final String title;
  final Color? titleColor;
  final Widget? trailing;

  const AppPageHeader({
    super.key,
    required this.title,
    this.titleColor,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: textTheme.headlineMedium?.copyWith(color: titleColor),
              ),
            ],
          ),
        ),
        if (trailing != null) ...[const SizedBox(width: 12), trailing!],
      ],
    );
  }
}
